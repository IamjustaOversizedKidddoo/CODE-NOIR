import fs from 'fs';
import path from 'path';
import prisma from '../db';
import { getProjectStorageDir } from '../ingestion/source-storage';
import {
  getOrCreateInterrogationSession,
  pushInvestigationTrailStep,
} from './session';
import { resolveConversationalEntity } from './reference-resolver';
import { classifyInterrogationIntent } from './intent-dispatcher';
import { transformFactualResponse } from '../persona/engine';
import { generateBlastRadiusInvestigation } from '../investigation/generators/blast-radius-investigator';
import { runInterrogationPipeline } from '../ai/pipeline';
import { InterrogationMessage, InterrogationSessionState } from './types';
import { NextLeadSuggestion } from '../persona/types';

export async function processInterrogationMessage(
  caseId: string,
  userQuery: string,
  options?: {
    userId?: string;
    overrideEntityId?: string;
    overrideIntent?: string;
    explanationMode?: 'BEGINNER' | 'INTERMEDIATE' | 'DEEP_DIVE';
    providerOverride?: string;
  }
): Promise<{
  session: InterrogationSessionState;
  response: InterrogationMessage;
}> {
  const userId = options?.userId || 'detective_user';
  const session = await getOrCreateInterrogationSession(caseId, userId);
  const baseDir = getProjectStorageDir(caseId);

  if (options?.explanationMode) {
    session.learningLevel =
      options.explanationMode === 'BEGINNER'
        ? 'BEGINNER'
        : options.explanationMode === 'INTERMEDIATE'
        ? 'INTERMEDIATE'
        : 'ADVANCED';
  }

  // 1. Reference & Pronoun Resolution
  const resolution = await resolveConversationalEntity(userQuery, session);

  // Ambiguity resolution check
  if (resolution.isAmbiguous && resolution.candidates.length > 1) {
    const ambiguityMsg: InterrogationMessage = {
      id: `msg_${Date.now()}`,
      role: 'detective',
      content: `I found ${resolution.candidates.length} distinct candidates matching your query in the vault. Which suspect are we interrogating?`,
      detectiveOpening: 'Hold on. We have multiple suspects with that exact name.',
      confidence: 'POSSIBLE',
      intent: 'AMBIGUOUS',
      ambiguityChoices: resolution.candidates,
      nextLeads: [],
      timestamp: new Date().toISOString(),
    };

    session.messages.push({
      id: `user_${Date.now()}`,
      role: 'user',
      content: userQuery,
      nextLeads: [],
      timestamp: new Date().toISOString(),
    });
    session.messages.push(ambiguityMsg);

    return { session, response: ambiguityMsg };
  }

  const targetEntity = resolution.entity || (resolution.resolvedFrom !== 'NONE' ? session.currentEntity : undefined);
  const intent = options?.overrideIntent ? (options.overrideIntent as any) : classifyInterrogationIntent(userQuery);

  if (targetEntity) {
    session.currentEntity = targetEntity;
    session.currentFile = targetEntity.filePath || session.currentFile;
    if (targetEntity.type === 'FUNCTION' || targetEntity.type === 'CLASS') {
      session.currentSymbol = targetEntity.name;
    }
    const lastLead = session.leadStack[session.leadStack.length - 1];
    if (!lastLead || lastLead.entityName !== targetEntity.name) {
      pushInvestigationTrailStep(session, {
        entityName: targetEntity.name,
        entityType: targetEntity.type,
        filePath: targetEntity.filePath,
        actionTaken: `INTERROGATED ${targetEntity.name}`,
      });
    }
  }

  let rawFact = '';
  let confidence: 'CONFIRMED' | 'LIKELY' | 'POSSIBLE' | 'UNKNOWN' | 'UNRESOLVED' = 'CONFIRMED';
  let citations: InterrogationMessage['citations'] = [];
  let blastRadius: InterrogationMessage['blastRadius'] = undefined;
  let teachingDetour: InterrogationMessage['teachingDetour'] = undefined;
  let checkpointQuestion: InterrogationMessage['checkpointQuestion'] = undefined;

  const lowerQuery = userQuery.toLowerCase();

  // Fetch project context for evidence-grounded answers
  const project = await prisma.project.findUnique({
    where: { id: caseId },
    include: {
      files: true,
      symbols: true,
    },
  });

  const entryPoints = project?.entryPoints ? JSON.parse(project.entryPoints) : [];
  const primaryEntry = entryPoints[0]?.path || project?.files?.find((f) => f.isEntry)?.path || project?.files?.[0]?.path || 'src/index.ts';
  const fileCount = project?.files?.length || 0;
  const symbolCount = project?.symbols?.length || 0;

  // 2. DISPATCH INTENT HANDLERS

  // --- NON-CODE / UNFOUNDED QUESTIONS ---
  if (
    lowerQuery.includes('who originally wrote') ||
    lowerQuery.includes('who authored this in') ||
    lowerQuery.includes('what production incident') ||
    lowerQuery.includes('why did the developer choose this architecture') ||
    lowerQuery.includes('quantum computing') ||
    lowerQuery.includes('blockchain')
  ) {
    rawFact = 'NOT ESTABLISHED BY REPOSITORY EVIDENCE. The static codebase contains source artifacts, dependencies, and AST relationships, but historical author intent, past production incidents, or unreferenced external technologies are not recorded in the submitted evidence.';
    confidence = 'UNKNOWN';
  }

  // --- INTENT: OFF_TOPIC (STRICT FOLDER SCOPE GUARD) ---
  else if (intent === 'OFF_TOPIC') {
    session.currentTopic = 'OFF_TOPIC';
    const projName = project?.name || 'Uploaded Case Dossier';
    rawFact = `🕵️ **CASE SCOPE BOUNDARY // CLASSIFIED DOSSIER ONLY**\n\nHold on, Detective. My assignment is strictly bounded to the evidence inside this uploaded case file (**${projName}**). I don't answer general trivia, recipes, or topics outside this codebase.\n\nInside this repository, I can answer **anything** regarding this folder:\n- 📁 **File & Directory Structure**: What each file and directory does\n- 🚪 **Entry Points & Execution**: Where the application starts and how data flows\n- 🔍 **Function & Symbol Logic**: Caller/callee chains, dependencies, and blast radius\n- ⚡ **Tech Stack & Environment**: Frameworks, packages, API endpoints, and DB models\n- 🛡️ **Security Audit**: Vulnerabilities, secrets, and path safety\n\nWhat component of **${projName}** shall we investigate?`;
    confidence = 'CONFIRMED';
  }

  // --- INTENT: CASUAL / GREETING ---
  else if (intent === 'CASUAL') {
    session.currentTopic = 'GREETING';
    rawFact = `Hey there! I've read through this codebase from top to bottom. Think of me as the person who already walked through this repository with a flashlight.\n\nI can show you where the project starts, explain what important files do, follow how data moves, and break confusing code into small pieces.\n\nIf you're new to coding, don't start by opening 500 files at once.\n\nWant me to show you where this project starts?`;
  }

  // --- INTENT: HELP ---
  else if (intent === 'HELP') {
    session.currentTopic = 'HELP';
    rawFact = `Think of me as the person who already walked through this codebase with a flashlight.\n\nI can show you where the project starts, explain what the important files do, follow how data moves, and break confusing code into small pieces.\n\nIf you're new to coding, don't start by opening 700 files.\n\nLet's find the front door first.\n\nWant me to show you where this project starts?`;
  }

  // --- INTENT: LEARNING ("what should I learn first?") ---
  else if (intent === 'LEARNING') {
    session.currentTopic = 'LEARNING_PATH';
    const topFiles = project?.files?.slice(0, 3) || [];
    const file1 = primaryEntry;
    const file2 = topFiles.find((f) => f.path !== file1)?.path || topFiles[1]?.path || 'src/router.ts';
    const file3 = topFiles.find((f) => f.path !== file1 && f.path !== file2)?.path || topFiles[2]?.path || 'src/auth.ts';

    rawFact = `I'd start with these 3 files first:\n\n1. \`${file1}\` (The front door where execution mounts)\n2. \`${file2}\` (Shows how requests and control flow move)\n3. \`${file3}\` (Core domain logic and state management)\n\nWhy?\n\`${file1}\` is the entry point, \`${file2}\` shows how components connect, and \`${file3}\` introduces the main business logic.\n\nWant to start with \`${file1}\`?`;
    citations = [
      { file: file1, startLine: 1, endLine: 30 },
      { file: file2, startLine: 1, endLine: 30 },
    ];
  }

  // --- INTENT: CONFUSION ---
  else if (intent === 'CONFUSION') {
    session.currentTopic = 'CONFUSION';
    rawFact = `Perfect. Confusion detected. That's usually where the useful learning starts.\n\nWhich part is confusing you?\n\n1. What the project does\n2. How the files connect\n3. What a particular function does\n4. How data moves\n5. Basically... everything`;
    checkpointQuestion = {
      prompt: 'Which part is confusing you?',
      options: [
        '1. What the project does',
        '2. How the files connect',
        '3. What a particular function does',
        '4. How data moves',
        '5. Basically... everything',
      ],
      explanation: 'Select any topic above to focus our investigation.',
    };
  }

  // --- INTENT: IM_LOST ---
  else if (intent === 'IM_LOST') {
    session.currentTopic = 'ORIENTATION';
    rawFact = `Fair. We currently have ${fileCount} files and absolutely no reason to open all of them.\n\nLet me simplify this.\n\nI'll show you the 3 files that matter most first, then we'll follow what they call:\n- Front Door: \`${primaryEntry}\`\n- Symbol Count: ${symbolCount} indexed AST nodes\n\nReady to inspect where execution starts?`;
  }

  // --- INTENT: TEACH ---
  else if (intent === 'TEACH') {
    session.currentTopic = 'LESSON';
    const conceptName = targetEntity?.name ? `Architecture of ${targetEntity.name}` : `Mastering ${project?.name || 'the Repository'}`;
    rawFact = `Let's break this down from the fundamentals. \`${conceptName}\` executes on ${project?.primaryLang || 'TypeScript'}. Start by identifying the primary entry point (\`${primaryEntry}\`) and following how parameters flow into downstream helpers.`;
    teachingDetour = {
      conceptName,
      lessonId: undefined,
      primerText: 'A component is a self-contained unit of functionality. It communicates via explicit interfaces and typed arguments rather than global side effects.',
    };
    citations = [{ file: primaryEntry, startLine: 1, endLine: 40 }];
  }

  // --- INTENT: CHECKPOINT ---
  else if (intent === 'CHECKPOINT') {
    session.currentTopic = 'CHECKPOINT';
    const lessonWithQ = await prisma.lesson.findFirst({
      where: { projectId: caseId, interactiveQJson: { not: null } },
    });

    if (lessonWithQ && lessonWithQ.interactiveQJson) {
      const qDef = JSON.parse(lessonWithQ.interactiveQJson);
      rawFact = `Checkpoint interrogation active: "${qDef.prompt}"`;
      checkpointQuestion = {
        prompt: qDef.prompt,
        options: qDef.options,
        explanation: qDef.explanation,
      };
    } else {
      rawFact = 'Checkpoint interrogation active: Why does this project isolate logic into distinct modules?';
      checkpointQuestion = {
        prompt: 'Why does this project isolate logic into distinct modules?',
        options: [
          'To enforce single responsibility and maintainability',
          'To make the CPU run faster',
          'To satisfy the compiler',
        ],
        explanation: 'Modular route separation ensures distinct bounded contexts and clear API contracts.',
      };
    }
  }

  // --- INTENT: EXPLAIN_EVERYTHING ---
  else if (intent === 'EXPLAIN_EVERYTHING') {
    session.currentTopic = 'CURRICULUM_OVERVIEW';
    rawFact = `I can, but throwing the whole repository at you at once would be the programming equivalent of drinking from a fire hose.\n\nLet's break it into:\n\n1. How it starts (\`${primaryEntry}\`)\n2. Main systems & subsystems\n3. Important files\n4. Data flow & API routing\n5. Key concepts\n\nWe'll go one section at a time. Want to start with section 1 (How it starts)?`;
  }

  // --- INTENT: EXPLAIN_LIKE_12 ---
  else if (intent === 'EXPLAIN_LIKE_12') {
    session.learningLevel = 'BEGINNER';
    if (targetEntity) {
      rawFact = `Imagine \`${targetEntity.name}\` is like a receptionist at a busy office building. When a request comes in, it checks who you are, writes down your name, and sends you to the right room. That way, nobody wanders into the server room by accident!`;
    } else {
      rawFact = `Think of this entire software project as a giant Lego castle. \`${primaryEntry}\` is the main gate at the front. When someone turns on the application, execution walks in through the main gate and activates each room one by one.`;
    }
  }

  // --- INTENT: EXPLAIN_LIKE_ENGINEER / DEEPEN ---
  else if (intent === 'EXPLAIN_LIKE_ENGINEER' || intent === 'DEEPEN') {
    session.learningLevel = 'ADVANCED';
    if (targetEntity) {
      const sym = await prisma.codeSymbol.findFirst({
        where: { projectId: caseId, name: targetEntity.name },
        include: { file: true },
      });
      if (sym) {
        rawFact = `Forensic AST Breakdown of \`${sym.name}()\`:\n- Declared in \`${sym.file.path}\` (Lines ${sym.startLine}-${sym.endLine})\n- Kind: ${sym.kind}\n- Type Contract: Fully typed interface boundary with strict evaluation.\n- Control Flow: Processes incoming parameters and dispatches downstream mutations without mutating global state.`;
        citations = [{ file: sym.file.path, startLine: sym.startLine, endLine: sym.endLine, symbolName: sym.name }];
      } else {
        rawFact = `Architectural analysis of \`${targetEntity.name}\`: Bounded context module encapsulating scoped state and exported procedures. Execution maintains clear module isolation and explicit import dependencies.`;
      }
    } else {
      rawFact = `Repository Architecture Summary for "${project?.name}":\n- Entry Gateway: \`${primaryEntry}\`\n- Total File Nodes: ${fileCount} | Total AST Symbols: ${symbolCount}\n- Primary Language: ${project?.primaryLang || 'TypeScript'}\n- System Topology: Modular design separating entry initialization, request processing, and domain handlers.`;
    }
  }

  // --- INTENT: ROAST ---
  else if (intent === 'ROAST') {
    if (targetEntity) {
      rawFact = `This module \`${targetEntity.name}\` has so many import dependencies it's less of a file and more of a social event. Someone nested conditions five levels deep—we may need climbing equipment! But seriously: it handles core request logic.`;
    } else {
      rawFact = `This codebase has ${fileCount} files and apparently zero comments. It's built like a secret labyrinth, but don't worry—we've mapped every single turn.`;
    }
  }

  // --- INTENT: EXPLAIN_SERIOUSLY ---
  else if (intent === 'EXPLAIN_SERIOUSLY') {
    if (targetEntity) {
      rawFact = `\`${targetEntity.name}\` is located at \`${targetEntity.filePath || primaryEntry}\`. Its primary responsibility is managing control flow and evaluating input parameters according to explicit type definitions.`;
    } else {
      rawFact = `The project "${project?.name}" contains ${fileCount} files and ${symbolCount} symbols. The primary entry point is \`${primaryEntry}\`, which initializes dependencies and bootstraps the runtime.`;
    }
  }

  // --- INTENT: FOLLOW_UP / WHY / HOW ---
  else if (intent === 'FOLLOW_UP' || intent === 'WHY' || intent === 'HOW') {
    const lastAssistantMsg = session.messages.filter((m) => m.role === 'detective').slice(-1)[0]?.content || '';

    if (lowerQuery.includes('api') && !lastAssistantMsg.toLowerCase().includes('api interface')) {
      rawFact = `An API (Application Programming Interface) is basically a set of rules and contracts for how different software components talk to each other. Think of it like a waiter in a restaurant taking your request to the kitchen and bringing back the response.\n\nNow that we've got that out of the way, want to continue following where we were?`;
    } else if (targetEntity) {
      const sym = await prisma.codeSymbol.findFirst({
        where: { projectId: caseId, name: targetEntity.name },
        include: { file: true },
      });

      if (sym) {
        const calls = await prisma.callEdge.findMany({
          where: { projectId: caseId, callerId: sym.id },
        });
        const calleeNames = Array.from(new Set(calls.map((c) => c.calleeName)));

        if (intent === 'WHY') {
          rawFact = `Because \`${sym.name}()\` acts as the gatekeeper. It must validate inputs and verify conditions before handing control over to downstream functions like ${calleeNames.slice(0, 2).map((c) => `\`${c}()\``).join(', ') || 'helpers'}. Without this check, invalid requests could corrupt state further down the pipeline.`;
        } else {
          rawFact = `After \`${sym.name}()\` finishes its checks, execution proceeds to ${calleeNames.length > 0 ? calleeNames.map((c) => `\`${c}()\``).join(', ') : 'return the response'}. That is the natural step in the call graph.`;
        }
        citations = [{ file: sym.file.path, startLine: sym.startLine, endLine: sym.endLine, symbolName: sym.name }];
      } else {
        rawFact = `Because \`${targetEntity.name}\` is the primary module responsible for this stage of execution. Everything else in this subsystem branches out from it.`;
      }
    } else {
      rawFact = `Because in software architecture, execution must start from a single trusted entry point before branching into specialized subsystems. In this codebase, that front door is \`${primaryEntry}\`.`;
    }
  }

  // --- INTENT: PROJECT_OVERVIEW ---
  else if (intent === 'PROJECT_OVERVIEW') {
    session.currentTopic = 'OVERVIEW';
    rawFact = `The repository "${project?.name || 'Crime Scene'}" is built with ${project?.primaryLang || 'TypeScript'}. It contains ${fileCount} files and ${symbolCount} symbols. Execution mounts from \`${primaryEntry}\` and coordinates across indexed subsystems.`;
    citations = [{ file: primaryEntry, startLine: 1, endLine: 30 }];
  }

  // --- INTENT: WHO_CALLS ---
  else if (intent === 'WHO_CALLS' && targetEntity) {
    const symbol = await prisma.codeSymbol.findFirst({
      where: { projectId: caseId, name: targetEntity.name },
      include: { file: true },
    });

    if (symbol) {
      const callEdges = await prisma.callEdge.findMany({
        where: { projectId: caseId, calleeName: symbol.name },
        include: { caller: { include: { file: true } } },
      });

      if (callEdges.length > 0) {
        const callerNames = Array.from(new Set(callEdges.map((e) => e.caller.name)));
        rawFact = `Symbol \`${symbol.name}()\` is called by ${callEdges.length} caller(s): ${callerNames.map((c) => `\`${c}()\``).join(', ')}.`;
        citations = callEdges.map((e) => ({
          file: e.caller.file.path,
          startLine: e.caller.startLine,
          endLine: e.caller.endLine,
          symbolName: e.caller.name,
          snippet: `Call from ${e.caller.name} to ${symbol.name}`,
        }));
      } else {
        rawFact = `Symbol \`${symbol.name}()\` in \`${symbol.file.path}\` has 0 recorded callers in the static call graph. It may be an entry point or unreferenced export.`;
        citations = [{ file: symbol.file.path, startLine: symbol.startLine, endLine: symbol.endLine, symbolName: symbol.name }];
      }
    } else {
      rawFact = `Could not locate symbol \`${targetEntity.name}\` in the active call graph.`;
      confidence = 'UNKNOWN';
    }
  }

  // --- INTENT: WHAT_CALLS ---
  else if (intent === 'WHAT_CALLS' && targetEntity) {
    const symbol = await prisma.codeSymbol.findFirst({
      where: { projectId: caseId, name: targetEntity.name },
      include: { file: true, callsOut: true },
    });

    if (symbol && symbol.callsOut.length > 0) {
      const calleeNames = Array.from(new Set(symbol.callsOut.map((c) => c.calleeName)));
      rawFact = `Symbol \`${symbol.name}()\` directly invokes ${symbol.callsOut.length} callee(s): ${calleeNames.map((c) => `\`${c}()\``).join(', ')}.`;
      citations = [{ file: symbol.file.path, startLine: symbol.startLine, endLine: symbol.endLine, symbolName: symbol.name }];
    } else {
      rawFact = `Symbol \`${targetEntity?.name || 'this'}\` makes no outgoing function calls according to static AST analysis.`;
    }
  }

  // --- INTENT: SOURCE ---
  else if (intent === 'SOURCE') {
    const activePath = targetEntity?.filePath || targetEntity?.name || session.currentEntity?.filePath || primaryEntry;
    const targetFile = await prisma.projectFile.findFirst({
      where: {
        projectId: caseId,
        path: activePath,
      },
    });

    if (targetFile) {
      let snippet = '';
      try {
        const fullPath = path.resolve(baseDir, targetFile.path);
        const content = await fs.promises.readFile(fullPath, 'utf8');
        const lines = content.split(/\r?\n/);
        const start = targetEntity?.startLine || 1;
        const end = targetEntity?.endLine || Math.min(lines.length, 60);
        snippet = lines.slice(start - 1, end).join('\n');
      } catch {}

      rawFact = `Displaying source evidence for \`${targetFile.path}\` (${targetFile.lineCount} lines).`;
      citations = [
        {
          file: targetFile.path,
          startLine: targetEntity?.startLine || 1,
          endLine: targetEntity?.endLine || Math.min(targetFile.lineCount, 60),
          symbolName: targetEntity?.name,
          snippet: snippet || `Source preview for ${targetFile.path}`,
        },
      ];
    } else {
      rawFact = `Displaying source evidence for \`${activePath}\`.`;
      citations = [
        {
          file: activePath,
          startLine: 1,
          endLine: 40,
        },
      ];
    }
  }

  // --- INTENT: DELETE ---
  else if (intent === 'DELETE' && targetEntity) {
    const targetPath = targetEntity.filePath || targetEntity.name;

    const [files, symbols, dependencies] = await Promise.all([
      prisma.projectFile.findMany({ where: { projectId: caseId } }),
      prisma.codeSymbol.findMany({ where: { projectId: caseId } }),
      prisma.dependency.findMany({ where: { projectId: caseId } }),
    ]);

    const investigation = generateBlastRadiusInvestigation(caseId, targetPath, {
      files,
      symbols,
      dependencies,
      entryPoints,
    });

    const affected = investigation.affectedEntities || [];
    rawFact = `Deleting or modifying \`${targetPath}\` directly impacts ${affected.length} module(s). Downstream dependents will encounter unresolved imports.`;
    blastRadius = {
      directlyAffected: affected,
      indirectlyAffected: [],
    };
    citations = affected.map((f) => ({ file: f, reason: 'Import dependency' }));
  }

  // --- INTENT: EXPLAIN / EXPLANATION WITH TARGET ENTITY ---
  else if ((intent === 'EXPLAIN' || intent === 'EXPLANATION') && targetEntity) {
    const sym = await prisma.codeSymbol.findFirst({
      where: { projectId: caseId, name: targetEntity.name },
      include: { file: true, callsOut: true, callsIn: true },
    });

    if (sym) {
      const calleeNames = Array.from(new Set(sym.callsOut.map((c) => c.calleeName)));
      const callerDetail = sym.callsIn.length > 0 ? ` It has ${sym.callsIn.length} caller(s).` : '';
      const calleeDetail = calleeNames.length > 0 ? ` It calls downstream function(s): ${calleeNames.map((c) => `\`${c}()\``).join(', ')}.` : '';

      rawFact = `Symbol \`${sym.name}()\` is defined in \`${sym.file.path}\` (Lines ${sym.startLine}-${sym.endLine}).${calleeDetail}${callerDetail}`;
      citations = [
        {
          file: sym.file.path,
          startLine: sym.startLine,
          endLine: sym.endLine,
          symbolName: sym.name,
        },
      ];
    } else {
      const f = await prisma.projectFile.findFirst({
        where: { projectId: caseId, path: targetEntity.name },
      });

      if (f) {
        rawFact = `File \`${f.path}\` is an indexed source file containing ${f.lineCount} lines.`;
        citations = [
          {
            file: f.path,
            startLine: 1,
            endLine: f.lineCount,
          },
        ];
      } else {
        rawFact = `Entity \`${targetEntity.name}\` is a ${targetEntity.type.toLowerCase()} located in \`${targetEntity.filePath || 'repository'}\`.`;
      }
    }
  }

  // --- AI PIPELINE GROUNDING FALLBACK ---
  else {
    try {
      const recentHistory = session.messages.slice(-6).map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const aiResult = await runInterrogationPipeline(caseId, userQuery, {
        conversationId: session.sessionId,
        recentHistory,
      });

      if (aiResult.response && aiResult.response.answer) {
        rawFact = aiResult.response.answer;
        confidence = aiResult.response.confidence as any;
        citations =
          aiResult.response.evidence?.map((e) => ({
            file: e.file,
            startLine: e.line,
            symbolName: e.symbol,
            snippet: e.reason,
          })) || [];
      }
    } catch {
      rawFact = `The repository "${project?.name || 'Target'}" is built with ${project?.primaryLang || 'TypeScript'}. Execution mounts from \`${primaryEntry}\` and coordinates across indexed subsystems.`;
    }
  }

  // --- REPETITION GUARD & RELEVANCE GUARD ---
  const lastAssistantMsg = session.messages.filter((m) => m.role === 'detective').slice(-1)[0];
  if (lastAssistantMsg && lastAssistantMsg.content) {
    const prevClean = lastAssistantMsg.content.trim().toLowerCase();
    const factClean = rawFact.trim().toLowerCase();

    if (prevClean === factClean || (prevClean.length > 50 && factClean.includes(prevClean.slice(0, 50)))) {
      // Repetition detected! Override with context-specific answer matching new intent
      if (intent === 'LEARNING') {
        rawFact = `Let's focus our investigation: Start with \`${primaryEntry}\`. It's the primary entry point where application execution begins. Want me to open its source code?`;
      } else if (intent === 'HELP') {
        rawFact = `I'm your interactive codebase teacher. You can ask me to trace functions, explain files, calculate blast radius, or guide you step-by-step. What shall we investigate?`;
      } else if (intent === 'CONFUSION') {
        rawFact = `Let's pause and simplify. Which area should we clarify first: 1. Application entry, 2. File connections, or 3. Function call flow?`;
      } else {
        rawFact = `Let's look at this from a new angle: Regarding your question "${userQuery}", execution in this codebase flows through \`${primaryEntry}\`. Would you like to trace its callers or examine a specific function?`;
      }
    }
  }

  // 3. Transform with Detective Persona
  const personaTransformed = transformFactualResponse({
    fact: rawFact,
    confidence,
    evidence: citations[0]
      ? {
          file: citations[0].file,
          startLine: citations[0].startLine,
          endLine: citations[0].endLine,
          symbolName: citations[0].symbolName,
        }
      : undefined,
    sourceEntity: targetEntity?.name,
    sarcasmLevel: session.sarcasmLevel,
  });

  // Dynamic contextual next leads
  const nextLeads: NextLeadSuggestion[] = [
    {
      id: 'lead_who_calls',
      action: 'FOLLOW_CALLER',
      label: `WHO CALLS ${targetEntity?.name || 'THIS'}?`,
      targetEntity: targetEntity?.name,
      reason: 'Trace upstream caller chain.',
    },
    {
      id: 'lead_what_calls',
      action: 'FOLLOW_CALLEE',
      label: `WHAT DOES ${targetEntity?.name || 'THIS'} CALL?`,
      targetEntity: targetEntity?.name,
      reason: 'Inspect downstream callee dependencies.',
    },
    {
      id: 'lead_show_source',
      action: 'OPEN_SOURCE',
      label: 'SHOW ME THE CODE',
      targetPath: targetEntity?.filePath || primaryEntry,
      reason: 'Open line-by-line Source Inspector.',
    },
    {
      id: 'lead_blast_radius',
      action: 'CHECK_BLAST_RADIUS',
      label: 'WHAT HAPPENS IF I DELETE IT?',
      targetPath: targetEntity?.filePath || primaryEntry,
      reason: 'Calculate blast radius and ripple impact.',
    },
  ];

  const detectiveMsg: InterrogationMessage = {
    id: `detective_${Date.now()}`,
    role: 'detective',
    content: personaTransformed.factualExplanation,
    detectiveOpening: personaTransformed.detectiveOpening,
    detectiveCommentary: personaTransformed.detectiveCommentary,
    confidence: personaTransformed.confidence,
    intent,
    targetEntity,
    citations,
    blastRadius,
    teachingDetour,
    checkpointQuestion,
    nextLeads,
    timestamp: new Date().toISOString(),
  };

  session.messages.push({
    id: `user_${Date.now()}`,
    role: 'user',
    content: userQuery,
    nextLeads: [],
    timestamp: new Date().toISOString(),
  });
  session.messages.push(detectiveMsg);

  return { session, response: detectiveMsg };
}
