import { StructuredLesson, LessonCodeEvidence, InteractiveQuestionDef, ConceptDef } from './types';
import { RankedEntity } from './importance-ranker';

export function generateCurriculumLessons(
  projectId: string,
  projectData: {
    name: string;
    primaryLang: string;
    files: { id: string; path: string; lineCount: number }[];
    symbols: { id: string; name: string; kind: string; fileId: string; startLine: number; endLine: number; isExported?: boolean }[];
    entryPoints: { path: string; reason: string }[];
    endpoints: { method: string; path: string; handlerName: string; line: number }[];
    envVars: { name: string }[];
    dbEvidence: { type: string; details: string; line: number }[];
    rankedFiles: RankedEntity[];
    concepts: ConceptDef[];
  }
): StructuredLesson[] {
  const lessons: StructuredLesson[] = [];
  const codeFiles = projectData.files.filter(
    (f) => !['package.json', 'tsconfig.json', 'readme.md', 'requirements.txt', 'go.mod'].includes(f.path.toLowerCase().split(/[\/\\]/).pop() || '')
  );
  const primaryEntry = projectData.entryPoints.find((ep) => !ep.path.endsWith('.json'))?.path || codeFiles[0]?.path || projectData.files[0]?.path || 'index.ts';
  const topCoreFile = projectData.rankedFiles.find((r) => !r.path.endsWith('.json'))?.path || primaryEntry;

  const exportedSymbols = projectData.symbols.filter((s) => s.isExported || s.kind === 'FUNCTION' || s.kind === 'METHOD');
  const authSymbol = exportedSymbols.find((s) =>
    ['auth', 'login', 'user', 'verify', 'token', 'password', 'session', 'permission'].some((k) => s.name.toLowerCase().includes(k))
  );

  // -------------------------------------------------------------
  // Level 0: Project Orientation & Front Door Entry Point
  // -------------------------------------------------------------
  lessons.push({
    projectId,
    level: 0,
    order: 1,
    title: `Dossier Briefing: What is ${projectData.name}?`,
    objective: 'Understand the primary purpose, problem space, and entry point of the codebase.',
    type: 'OVERVIEW',
    difficulty: 'BEGINNER',
    prerequisites: [],
    content: {
      level: 0,
      caseClue: `🕵️ CASE CLUE: We are stepping onto the crime scene of ${projectData.name}. Every software investigation begins by finding the front door.`,
      whyMatters: 'Every software investigation begins with understanding why the system exists before analyzing its components.',
      whatInvestigating: `High-level project scope and functional entry point in ${primaryEntry}.`,
      simpleExplanation: `Think of this project as a building. File "${primaryEntry}" is the front door where all activity begins. When someone starts the app, execution enters right here.`,
      technicalExplanation: `The codebase comprises ${projectData.files.length} indexed files and ${projectData.symbols.length} deterministic symbols structured around ${projectData.primaryLang} conventions.`,
      whyCare: {
        whatIsIt: `The primary entry point file (${primaryEntry}).`,
        whatDoesItDo: 'Initializes the runtime environment and mounts core application services.',
        whyExists: 'Without a designated front door, the operating environment would not know where to start executing code.',
        whatUsesIt: 'The runtime engine, container initializer, or CLI process.',
        whatDoesItUse: 'Imports supporting services and core configuration modules.',
        whatBreaksWithoutIt: 'The application fails to start entirely.',
      },
      conceptCard: {
        name: 'APPLICATION ENTRY POINT',
        category: 'ARCHITECTURE',
        whatItIs: 'The first line of code that runs when an application starts.',
        whyExists: 'To provide a single, unambiguous starting gate for runtime execution.',
        whatDoingHere: `In this project, execution begins at ${primaryEntry}.`,
      },
      neighborhood: [
        { name: primaryEntry, type: 'FILE', relationship: 'CURRENT' },
        { name: topCoreFile, type: 'FILE', relationship: 'IMPORTS' },
      ],
      evidence: [
        {
          file: primaryEntry,
          startLine: 1,
          endLine: Math.min(20, projectData.files.find((f) => f.path === primaryEntry)?.lineCount || 20),
          snippet: `// Primary Entry Gateway: ${primaryEntry}\n// Execution starts here when the application launches.`,
        },
      ],
      connections: {
        upstream: ['Project Manifest'],
        downstream: [topCoreFile, 'Services'],
        relatedSubsystems: ['Core Engine'],
      },
      example: `Starting the application exposes entry points defined in ${primaryEntry}.`,
      recap: [
        `Built primarily in ${projectData.primaryLang}`,
        `Total footprint: ${projectData.files.length} files and ${projectData.symbols.length} symbols`,
      ],
      completionCriteria: [
        'Identify the primary programming language',
        'State the front door entry point of the codebase',
      ],
      whatIfScenario: {
        question: `What happens if the entry file "${primaryEntry}" is renamed without updating package scripts?`,
        options: [
          'The runtime engine will throw a "Cannot find module / entry point" error on startup.',
          'The app automatically guesses the new entry file name.',
          'Nothing happens because file names are ignored by compilers.',
        ],
        correctAnswer: 'The runtime engine will throw a "Cannot find module / entry point" error on startup.',
        explanation: 'Static entry point configurations rely on exact relative file paths.',
      },
      predictNext: {
        prompt: `Where does execution flow immediately after launching "${primaryEntry}"?`,
        options: [
          `Into core business modules like ${topCoreFile}`,
          'Directly into unit test assertions',
          'Into a non-existent database file',
        ],
        correctOptionIndex: 0,
        explanation: `Entry points delegate execution to core supporting files like ${topCoreFile}.`,
      },
      detectiveNotes: {
        note: `Target codebase ${projectData.name} uses ${projectData.primaryLang} as its primary language.`,
        evidence: `Static manifest and AST analysis indexed ${projectData.files.length} files.`,
        suspicious: `Check if entry point ${primaryEntry} delegates work or handles everything inline.`,
        beginnerTip: `Think of entry points as the "Play" button on a game controller.`,
      },
    },
    evidence: [{ file: primaryEntry, startLine: 1, endLine: 20, snippet: `// Entry: ${primaryEntry}` }],
    investigationType: 'ARCHITECTURE',
    interactiveQuestion: {
      id: 'q_lvl0_1',
      type: 'IDENTIFICATION',
      prompt: `What is the primary programming language used to build ${projectData.name}?`,
      options: [projectData.primaryLang, 'C++', 'Ruby on Rails', 'Rust'],
      expectedAnswerHint: projectData.primaryLang,
      explanation: `Static manifest and AST discovery confirm that ${projectData.primaryLang} is the dominant language.`,
      relatedConceptNames: ['TypeScript & JavaScript Async/Await', 'Python Decorators & Functions'],
      rubric: {
        keyPoints: [projectData.primaryLang],
        misconceptions: ['Assuming languages without static manifest evidence'],
      },
    },
    estimatedMinutes: 5,
  });

  // -------------------------------------------------------------
  // Level 1: Technology Arsenal & Toolchain
  // -------------------------------------------------------------
  lessons.push({
    projectId,
    level: 1,
    order: 2,
    title: 'Technology Arsenal & Toolchain',
    objective: 'Identify the runtime environment, dependencies, frameworks, and external packages.',
    type: 'TECH_STACK',
    difficulty: 'BEGINNER',
    prerequisites: ['Basic Package Management'],
    content: {
      level: 1,
      caseClue: '🕵️ CASE CLUE: Before questioning suspects, we must inspect the toolchain and imported libraries.',
      whyMatters: 'External libraries dictate how network calls, security, and data storage are handled.',
      whatInvestigating: 'Manifest configuration, external dependencies, and package declarations.',
      simpleExplanation: 'Imports are like hiring specialized helpers. Instead of building a database or web server from scratch, programmers import third-party packages to do heavy lifting.',
      technicalExplanation: 'Manifest files define dependency graphs, script commands, and third-party library versions.',
      whyCare: {
        whatIsIt: 'Project dependencies and package manifest configuration.',
        whatDoesItDo: 'Specifies external libraries required to execute the application.',
        whyExists: 'Avoids reinventing common utilities like HTTP routers, encryption, and ORMs.',
        whatUsesIt: 'Package managers (npm, pip, cargo) during build and installation.',
        whatDoesItUse: 'Third-party registries (npm registry, PyPI).',
        whatBreaksWithoutIt: 'Missing imports lead to module resolution failures at runtime.',
      },
      conceptCard: {
        name: 'DEPENDENCY / IMPORT',
        category: 'FRAMEWORK',
        whatItIs: 'A code library written by someone else that you bring into your project.',
        whyExists: 'To reuse reliable, battle-tested solutions instead of writing everything yourself.',
        whatDoingHere: 'Provides essential utilities for web routes, formatting, or database access.',
      },
      neighborhood: [
        { name: 'package.json', type: 'FILE', relationship: 'CURRENT' },
        { name: primaryEntry, type: 'FILE', relationship: 'IMPORTS' },
      ],
      evidence: [
        {
          file: 'package.json',
          startLine: 1,
          endLine: Math.min(15, projectData.files.find((f) => f.path === 'package.json')?.lineCount || 15),
          snippet: `// Manifest: package.json\n// Defines dependencies and runtime toolchain.`,
        },
      ],
      connections: {
        upstream: ['Package Registry'],
        downstream: [primaryEntry],
        relatedSubsystems: ['Build Toolchain'],
      },
      example: 'Importing an HTTP library allows handling client requests with a single line of code.',
      recap: [
        `Primary Language: ${projectData.primaryLang}`,
        'Dependencies define third-party capabilities.',
      ],
      completionCriteria: ['Explain why external dependencies are imported into projects'],
      whatIfScenario: {
        question: 'What happens if a required dependency is missing from the node_modules folder?',
        options: [
          'The app throws a "MODULE_NOT_FOUND" error when attempting to run.',
          'The app writes the missing code automatically.',
          'The app ignores the missing library without issue.',
        ],
        correctAnswer: 'The app throws a "MODULE_NOT_FOUND" error when attempting to run.',
        explanation: 'Imports strictly require referenced packages to exist on disk.',
      },
      predictNext: {
        prompt: 'How do imported packages reach source files?',
        options: [
          'Via import / require statements at the top of code files',
          'By copy-pasting code into comments',
          'Through magic operating system environment variables',
        ],
        correctOptionIndex: 0,
        explanation: 'Source files explicitly import third-party symbols using import statements.',
      },
      detectiveNotes: {
        note: 'Manifest files list all external suspects (libraries) brought into the project.',
        evidence: 'Indexed project dependencies and manifest items.',
        suspicious: 'Unused dependencies bloat bundle size and increase attack surface.',
        beginnerTip: 'Think of imports as ordering tools from a hardware store catalogue.',
      },
    },
    evidence: [{ file: 'package.json', startLine: 1, endLine: 15, snippet: '// Manifest' }],
    investigationType: 'DEPENDENCY_FLOW',
    interactiveQuestion: {
      id: 'q_lvl1_1',
      type: 'REASONING',
      prompt: 'Why do developers import external libraries into a project?',
      options: [
        'To reuse existing functionality without writing complex features from scratch',
        'To make the source code intentionally harder to read',
        'Because code cannot run without at least 50 external libraries',
      ],
      expectedAnswerHint: 'To reuse existing functionality without writing complex features from scratch',
      explanation: 'Dependencies accelerate development by providing pre-built solutions for common problems.',
      relatedConceptNames: ['Dependency / Import'],
      rubric: {
        keyPoints: ['reuse existing functionality', 'without writing from scratch'],
        misconceptions: ['Assuming dependencies are purely decorative'],
      },
    },
    estimatedMinutes: 5,
  });

  // -------------------------------------------------------------
  // Level 2: Project Structure & Anatomy
  // -------------------------------------------------------------
  const structureTarget = codeFiles[0]?.path || topCoreFile;
  lessons.push({
    projectId,
    level: 2,
    order: 3,
    title: 'Anatomy of the Crime Scene: Project Structure',
    objective: 'Map directory layout, module boundaries, and file relationships.',
    type: 'DIRECTORY_MAP',
    difficulty: 'BEGINNER',
    prerequisites: ['Basic Package Management'],
    content: {
      level: 2,
      caseClue: `🕵️ CASE CLUE: We are mapping the layout of ${projectData.name}. Understanding how files are grouped into folders reveals the system's architecture.`,
      whyMatters: 'Directory structures reflect software design patterns and component boundaries.',
      whatInvestigating: `Directory layout and file distribution in ${structureTarget}.`,
      simpleExplanation: `Think of a codebase like a book with chapters. Source code files live in the "src" or "lib" directory, keeping business rules separated from configuration.`,
      technicalExplanation: `The repository partitions modules across directories, enforcing separation of concerns between handlers, services, and utilities.`,
      whyCare: {
        whatIsIt: 'Project directory layout and file hierarchy.',
        whatDoesItDo: 'Groups source code, tests, and configuration into logical directories.',
        whyExists: 'To prevent large codebases from becoming unmaintainable single-folder messes.',
        whatUsesIt: 'The compiler and developers when resolving relative import paths.',
        whatDoesItUse: 'File system paths and module alias configurations.',
        whatBreaksWithoutIt: 'Deeply nested imports become fragile and hard to locate.',
      },
      conceptCard: {
        name: 'DIRECTORY STRUCTURE & MODULES',
        category: 'ARCHITECTURE',
        whatItIs: 'The folder layout used to organize code into logical areas.',
        whyExists: 'To keep related functions together and make code readable for teams.',
        whatDoingHere: `Organizes ${projectData.files.length} indexed files into functional directories.`,
      },
      neighborhood: [
        { name: structureTarget, type: 'FILE', relationship: 'CURRENT' },
        { name: primaryEntry, type: 'FILE', relationship: 'IMPORTS' },
      ],
      evidence: [
        {
          file: structureTarget,
          startLine: 1,
          endLine: Math.min(25, projectData.files.find((f) => f.path === structureTarget)?.lineCount || 25),
          snippet: `// File Location: ${structureTarget}\n// Demonstrates module placement in project hierarchy.`,
        },
      ],
      connections: {
        upstream: [primaryEntry],
        downstream: [topCoreFile],
        relatedSubsystems: ['Directory Structure'],
      },
      example: 'Files in "src/auth" handle authentication while "src/db" handles persistence.',
      recap: ['Directories separate concerns into logical modules'],
      completionCriteria: ['Explain how folders organize source code files'],
      whatIfScenario: {
        question: `What happens if a source file inside "${structureTarget}" is moved to another folder?`,
        options: [
          'Relative import paths pointing to that file must be updated, or build errors will occur.',
          'The compiler automatically updates all import paths silently.',
          'The file continues working regardless of location.',
        ],
        correctAnswer: 'Relative import paths pointing to that file must be updated, or build errors will occur.',
        explanation: 'Relative import statements (e.g. ./user) depend on exact file system locations.',
      },
      predictNext: {
        prompt: 'Which file is executed right after folder structure initialization?',
        options: [
          `The front door entry gateway (${primaryEntry})`,
          'A random unindexed binary file',
          'The project LICENSE file',
        ],
        correctOptionIndex: 0,
        explanation: 'The boot sequence begins at the entry point after module resolution.',
      },
      detectiveNotes: {
        note: `Project contains ${codeFiles.length} source code files.`,
        evidence: 'File tree AST indexing.',
        suspicious: 'Avoid deeply nested folder hierarchies (depth > 8).',
        beginnerTip: 'Folders in code are just like folders on your desktop.',
      },
    },
    evidence: [{ file: structureTarget, startLine: 1, endLine: 25, snippet: `// ${structureTarget}` }],
    investigationType: 'ARCHITECTURE',
    interactiveQuestion: {
      id: 'q_lvl2_1',
      type: 'IDENTIFICATION',
      prompt: `Why do projects separate source code files into folders like "src" or "lib"?`,
      options: [
        'To organize files by responsibility and maintain a clean architecture',
        'To slow down the computer during compilation',
        'Because code files cannot exist in the root folder',
      ],
      expectedAnswerHint: 'To organize files by responsibility and maintain a clean architecture',
      explanation: 'Modular folder structures improve code maintainability and team collaboration.',
      relatedConceptNames: ['Directory Structure & Modules'],
      rubric: {
        keyPoints: ['organize files by responsibility', 'clean architecture'],
        misconceptions: ['Assuming folder names affect execution speed'],
      },
    },
    estimatedMinutes: 6,
  });

  // -------------------------------------------------------------
  // Level 3: Application Boot Sequence
  // -------------------------------------------------------------
  lessons.push({
    projectId,
    level: 3,
    order: 4,
    title: 'The Spark: Application Boot Sequence',
    objective: 'Trace how the system initializes runtime configuration and mounts services.',
    type: 'STARTUP_SEQUENCE',
    difficulty: 'BEGINNER',
    prerequisites: ['Application Entry Point'],
    content: {
      level: 3,
      caseClue: `🕵️ CASE CLUE: We are watching the ignition key turn in ${primaryEntry}. Let's trace how the application boots.`,
      whyMatters: 'Understanding boot sequence explains how configuration, environment variables, and connections are set up.',
      whatInvestigating: `Initialization calls and startup routines in ${primaryEntry}.`,
      simpleExplanation: 'Booting an app is like turning on a car. The starter motor runs, dashboard lights check systems, and the engine starts running.',
      technicalExplanation: 'The startup routine loads environment variables, instantiates core singletons, and binds HTTP servers or CLI listeners.',
      whyCare: {
        whatIsIt: 'Application startup & boot sequence.',
        whatDoesItDo: 'Executes initial setup routines required before accepting user traffic.',
        whyExists: 'Ensures database connections, configuration, and security keys are ready.',
        whatUsesIt: 'Server processes, container orchestrators, and CLI invocation.',
        whatDoesItUse: 'Environment variables, database clients, and HTTP listeners.',
        whatBreaksWithoutIt: 'Services accept requests before dependencies are connected.',
      },
      conceptCard: {
        name: 'BOOT SEQUENCE & INITIALIZATION',
        category: 'ARCHITECTURE',
        whatItIs: 'The startup phase where an app prepares its tools before handling work.',
        whyExists: 'To verify connections and configurations before accepting user input.',
        whatDoingHere: `Initializes services in ${primaryEntry}.`,
      },
      neighborhood: [
        { name: primaryEntry, type: 'FILE', relationship: 'CURRENT' },
        { name: topCoreFile, type: 'FILE', relationship: 'CALLS' },
      ],
      evidence: [
        {
          file: primaryEntry,
          startLine: 1,
          endLine: Math.min(30, projectData.files.find((f) => f.path === primaryEntry)?.lineCount || 30),
          snippet: `// Boot Sequence: ${primaryEntry}\n// Initializes services and binds listeners.`,
        },
      ],
      connections: {
        upstream: ['Environment Config'],
        downstream: [topCoreFile],
        relatedSubsystems: ['Runtime Bootstrapper'],
      },
      example: 'Loading environment variables on startup provides secret keys to database connectors.',
      recap: ['Boot sequences prepare runtime dependencies before receiving traffic'],
      completionCriteria: ['Trace startup initialization in the entry point'],
      whatIfScenario: {
        question: 'What happens if a database connection fails during application boot?',
        options: [
          'The application logs a connection error and usually aborts startup.',
          'The app automatically invents a fake database in memory.',
          'The app continues running as if nothing happened.',
        ],
        correctAnswer: 'The application logs a connection error and usually aborts startup.',
        explanation: 'Failed critical connections during boot trigger fail-fast startup crashes.',
      },
      predictNext: {
        prompt: 'Once the boot sequence completes, what state does a server app enter?',
        options: [
          'An active listening state waiting for client HTTP/TCP requests',
          'Immediate process termination',
          'Infinite compilation loop',
        ],
        correctOptionIndex: 0,
        explanation: 'Servers remain in an event loop listening for incoming network requests.',
      },
      detectiveNotes: {
        note: `Boot sequence starts in ${primaryEntry}.`,
        evidence: 'AST startup call trace.',
        suspicious: 'Never perform heavy synchronous computations during the boot sequence.',
        beginnerTip: 'Think of booting as pre-heating an oven before baking.',
      },
    },
    evidence: [{ file: primaryEntry, startLine: 1, endLine: 30, snippet: `// ${primaryEntry}` }],
    investigationType: 'STARTUP_FLOW',
    interactiveQuestion: {
      id: 'q_lvl3_1',
      type: 'REASONING',
      prompt: 'What is the main goal of an application boot sequence?',
      options: [
        'To load configuration and establish essential connections before accepting work',
        'To delete temporary files from the operating system',
        'To display a splash screen image for 10 seconds',
      ],
      expectedAnswerHint: 'To load configuration and establish essential connections before accepting work',
      explanation: 'Boot sequences ensure all dependencies are initialized before processing user requests.',
      relatedConceptNames: ['Boot Sequence & Initialization'],
      rubric: {
        keyPoints: ['load configuration', 'establish essential connections'],
        misconceptions: ['Thinking boot sequences are only cosmetic'],
      },
    },
    estimatedMinutes: 6,
  });

  // -------------------------------------------------------------
  // Level 4: Inter-Module Wiring
  // -------------------------------------------------------------
  lessons.push({
    projectId,
    level: 4,
    order: 5,
    title: 'Under the Hood: Inter-Module Wiring',
    objective: 'Examine how modules pass messages, invoke functions, and share data contracts.',
    type: 'MODULE_WIRING',
    difficulty: 'INTERMEDIATE',
    prerequisites: ['Directory Structure & Modules'],
    content: {
      level: 4,
      caseClue: `🕵️ CASE CLUE: We are inspecting the telephone wires connecting ${primaryEntry} to ${topCoreFile}.`,
      whyMatters: 'Inter-module wiring defines how components collaborate without leaking implementation details.',
      whatInvestigating: `Static import and call relationships between ${primaryEntry} and ${topCoreFile}.`,
      simpleExplanation: 'Inter-module wiring is like wiring a home stereo system. The receiver (entry point) connects to speakers (core modules) via cables (imports).',
      technicalExplanation: 'Modules expose public interface exports while encapsulating private state, enabling modular dependency injection.',
      whyCare: {
        whatIsIt: 'Inter-module import and function call wiring.',
        whatDoesItDo: 'Allows separate source files to exchange data and invoke operations.',
        whyExists: 'Enables high cohesion and low coupling across independent modules.',
        whatUsesIt: 'Every non-trivial software application.',
        whatDoesItUse: 'Static import declarations and exported function symbols.',
        whatBreaksWithoutIt: 'Components become isolated islands unable to share logic.',
      },
      conceptCard: {
        name: 'INTER-MODULE WIRING',
        category: 'ARCHITECTURE',
        whatItIs: 'The import and call connections that link separate files together.',
        whyExists: 'To allow specialized modules to talk to each other.',
        whatDoingHere: `Connects ${primaryEntry} to ${topCoreFile}.`,
      },
      neighborhood: [
        { name: primaryEntry, type: 'FILE', relationship: 'IMPORTS' },
        { name: topCoreFile, type: 'FILE', relationship: 'CURRENT' },
      ],
      evidence: [
        {
          file: topCoreFile,
          startLine: 1,
          endLine: Math.min(20, projectData.files.find((f) => f.path === topCoreFile)?.lineCount || 20),
          snippet: `// Inter-Module Connection: ${topCoreFile}\n// Receives calls from ${primaryEntry}`,
        },
      ],
      connections: {
        upstream: [primaryEntry],
        downstream: ['Data Access'],
        relatedSubsystems: ['Module Graph'],
      },
      example: 'An entry point imports an authentication module to process login tokens.',
      recap: ['Imports wire modules together into a connected network'],
      completionCriteria: ['Trace call connections between two primary files'],
      whatIfScenario: {
        question: `What happens if ${primaryEntry} imports a function that is not exported by ${topCoreFile}?`,
        options: [
          'The compiler reports an "Export not found" error.',
          'The function is exported automatically by default.',
          'The runtime ignores the import without error.',
        ],
        correctAnswer: 'The compiler reports an "Export not found" error.',
        explanation: 'Files must explicitly export symbols for other modules to import them.',
      },
      predictNext: {
        prompt: `Where does data go after passing through ${topCoreFile}?`,
        options: [
          'Into domain functions and specialized helper routines',
          'Directly into text documentation',
          'Into a binary dump file',
        ],
        correctOptionIndex: 0,
        explanation: 'Domain modules delegate execution to specialized internal functions.',
      },
      detectiveNotes: {
        note: `Modules in ${projectData.name} communicate via static exports.`,
        evidence: 'AST import and call graph edges.',
        suspicious: 'Avoid circular imports (A imports B, B imports A).',
        beginnerTip: 'Think of imports as plugging cables into a wall outlet.',
      },
    },
    evidence: [{ file: topCoreFile, startLine: 1, endLine: 20, snippet: `// ${topCoreFile}` }],
    investigationType: 'CALL_FLOW',
    interactiveQuestion: {
      id: 'q_lvl4_1',
      type: 'CONNECTION',
      prompt: 'How does one JavaScript / TypeScript file use code written in another file?',
      options: [
        'By exporting symbols in the source file and importing them in the consuming file',
        'By storing both files in the exact same directory without imports',
        'By copying the code manually into every file',
      ],
      expectedAnswerHint: 'By exporting symbols in the source file and importing them in the consuming file',
      explanation: 'Export and import syntax establishes explicit, verifiable connections between modules.',
      relatedConceptNames: ['Inter-Module Wiring'],
      rubric: {
        keyPoints: ['exporting symbols', 'importing in consuming file'],
        misconceptions: ['Assuming files share global scope without imports'],
      },
    },
    estimatedMinutes: 6,
  });

  // -------------------------------------------------------------
  // Level 5: Core Module Deep Dive
  // -------------------------------------------------------------
  lessons.push({
    projectId,
    level: 5,
    order: 6,
    title: `Deep Dive: Core Module [${topCoreFile}]`,
    objective: `Examine the internal structure, classes, and exported methods of ${topCoreFile}.`,
    type: 'CORE_MODULE',
    difficulty: 'INTERMEDIATE',
    prerequisites: ['Type Contracts & Interfaces'],
    content: {
      level: 5,
      caseClue: `🕵️ CASE CLUE: We are entering the main suspect's headquarters: ${topCoreFile}. This file contains core domain logic.`,
      whyMatters: 'Core modules contain primary business rules and state transformations.',
      whatInvestigating: `Internal functions and classes inside ${topCoreFile}.`,
      simpleExplanation: `Think of ${topCoreFile} as a department manager in an office. It receives commands, validates data, and instructs helper files to execute tasks.`,
      technicalExplanation: `The module encapsulates business logic methods, handling validation and triggering downstream service calls.`,
      whyCare: {
        whatIsIt: `The core domain module (${topCoreFile}).`,
        whatDoesItDo: 'Coordinates business logic rules and manages component orchestration.',
        whyExists: 'To isolate essential application logic from web handlers and storage details.',
        whatUsesIt: 'API routes, CLI commands, or background jobs.',
        whatDoesItUse: 'Data persistence abstractions and utility helper functions.',
        whatBreaksWithoutIt: 'The central business rules of the application collapse.',
      },
      conceptCard: {
        name: 'MODULAR COMPONENT',
        category: 'ARCHITECTURE',
        whatItIs: 'A self-contained file or class that manages a specific domain responsibility.',
        whyExists: 'To keep code organized into small, manageable, single-purpose pieces.',
        whatDoingHere: `Encapsulates core domain operations in ${topCoreFile}.`,
      },
      neighborhood: [
        { name: primaryEntry, type: 'FILE', relationship: 'IMPORTED_BY' },
        { name: topCoreFile, type: 'FILE', relationship: 'CURRENT' },
      ],
      evidence: [{ file: topCoreFile, startLine: 1, endLine: 25, snippet: `// Deep Dive: ${topCoreFile}\n// Core domain logic processing` }],
      connections: {
        upstream: [primaryEntry],
        downstream: ['Storage / Helpers'],
        relatedSubsystems: ['Core Engine'],
      },
      example: `Calling a public method on ${topCoreFile} executes business validation.`,
      recap: ['Core modules govern application state and workflow coordination'],
      completionCriteria: ['Explain the responsibility of the core module'],
      whatIfScenario: {
        question: `What happens if a method inside ${topCoreFile} throws an uncaught error?`,
        options: [
          'Execution stops unless caught by an upstream error handler.',
          'The code automatically fixes itself at runtime.',
          'Errors inside core modules are ignored automatically.',
        ],
        correctAnswer: 'Execution stops unless caught by an upstream error handler.',
        explanation: 'Uncaught exceptions bubble up the call stack until intercepted by error handlers.',
      },
      predictNext: {
        prompt: `Where does ${topCoreFile} send processed data?`,
        options: [
          'Downstream to data access modules or output channels',
          'Backwards into unread documentation files',
          'Into a void with no return value',
        ],
        correctOptionIndex: 0,
        explanation: 'Core modules delegate persistence or output to downstream helper components.',
      },
      detectiveNotes: {
        note: `${topCoreFile} is ranked with high centrality score in the dependency graph.`,
        evidence: 'Static import graph centrality analysis.',
        suspicious: 'Avoid letting single core modules grow into unmaintainable "God Objects".',
        beginnerTip: 'Think of core modules as the brain of an application.',
      },
    },
    evidence: [{ file: topCoreFile, startLine: 1, endLine: 25, snippet: `// ${topCoreFile}` }],
    investigationType: 'RUNTIME_FLOW',
    interactiveQuestion: {
      id: 'q_lvl5_1',
      type: 'RECALL',
      prompt: `What is the primary role of ${topCoreFile} in the project architecture?`,
      options: [
        'It coordinates core domain logic and delegates to supporting modules',
        'It is just an unused dummy file',
        'It only contains raw CSS styles',
      ],
      expectedAnswerHint: 'It coordinates core domain logic and delegates to supporting modules',
      explanation: `${topCoreFile} is ranked with high centrality, coordinating key application operations.`,
      relatedConceptNames: ['Modular Component'],
      rubric: {
        keyPoints: ['coordinates', 'core domain logic', 'delegates'],
        misconceptions: ['Treating core files as passive static assets'],
      },
    },
    estimatedMinutes: 7,
  });

  // -------------------------------------------------------------
  // Level 6: Core Symbol & Logic Mechanics (Authentication / Core Function)
  // -------------------------------------------------------------
  const targetSym = authSymbol || exportedSymbols[0];
  if (targetSym) {
    const symFile = projectData.files.find((f) => f.id === targetSym.fileId)?.path || topCoreFile;
    lessons.push({
      projectId,
      level: 6,
      order: 6,
      title: `Logic Mechanics: Interrogating [${targetSym.name}()]`,
      objective: `Trace how function ${targetSym.name}() processes inputs and executes core domain rules.`,
      type: 'FUNCTION_CLASS',
      difficulty: 'INTERMEDIATE',
      prerequisites: ['TypeScript & JavaScript Async/Await'],
      content: {
        level: 6,
        caseClue: `🕵️ CASE CLUE: We are placing function ${targetSym.name}() under the interrogation lamp. Let's inspect its line-by-line mechanics.`,
        whyMatters: `Function ${targetSym.name}() is a primary operational boundary in ${symFile}.`,
        whatInvestigating: `Internal control flow, argument validation, and downstream calls inside ${targetSym.name}().`,
        simpleExplanation: `Think of function ${targetSym.name}() as a receptionist at a building desk. Someone arrives with input parameters. The function accepts the inputs, performs checks, and asks downstream helpers to complete the job.`,
        technicalExplanation: `AST parsing confirms ${targetSym.name}() is defined at lines ${targetSym.startLine}-${targetSym.endLine} in ${symFile}. It processes arguments and executes call expressions.`,
        whyCare: {
          whatIsIt: `Function symbol ${targetSym.name}().`,
          whatDoesItDo: 'Executes parameterized logic checks and triggers downstream function calls.',
          whyExists: 'To encapsulate specific domain operations into a reusable, testable routine.',
          whatUsesIt: 'Upstream caller routines and entry handlers.',
          whatDoesItUse: 'Downstream helper functions and data access procedures.',
          whatBreaksWithoutIt: `Callers expecting ${targetSym.name}() encounter runtime undefined or invocation errors.`,
        },
        conceptCard: {
          name: 'FUNCTION / METHOD',
          category: 'LANGUAGE',
          whatItIs: 'A reusable block of code designed to perform a specific task.',
          whyExists: 'To prevent duplicate code and break complex problems into small, testable steps.',
          whatDoingHere: `In ${symFile}, function ${targetSym.name}() executes core domain logic.`,
        },
        neighborhood: [
          { name: targetSym.name, type: 'SYMBOL', relationship: 'CURRENT' },
          { name: symFile, type: 'FILE', relationship: 'IMPORTS' },
        ],
        evidence: [
          {
            file: symFile,
            startLine: targetSym.startLine,
            endLine: targetSym.endLine,
            symbolName: targetSym.name,
            snippet: `// Function Definition: ${targetSym.name}() in ${symFile}\n// Lines ${targetSym.startLine}-${targetSym.endLine}`,
          },
        ],
        connections: {
          upstream: ['Caller Handlers'],
          downstream: ['Callee Helpers'],
          relatedSubsystems: ['Domain Logic Tier'],
        },
        example: `Invoking ${targetSym.name}() triggers internal verification before returning results.`,
        recap: [`${targetSym.name}() encapsulates essential business logic rules`],
        completionCriteria: [`Trace input parameter processing inside ${targetSym.name}()`],
        whatIfScenario: {
          question: `What happens if the signature of ${targetSym.name}() is changed without updating calling sites?`,
          options: [
            'Calling code will pass incorrect arguments, causing compilation errors or runtime bugs.',
            'The compiler automatically updates all calling functions across the codebase.',
            'Parameters automatically adjust to match whatever is passed.',
          ],
          correctAnswer: 'Calling code will pass incorrect arguments, causing compilation errors or runtime bugs.',
          explanation: 'Function signatures define rigid argument contracts between callers and callees.',
        },
        predictNext: {
          prompt: `Where does execution flow after ${targetSym.name}() finishes processing?`,
          options: [
            'Control returns to the calling function with the return result',
            'Execution exits the operating system entirely',
            'The code loops infinitely in a void',
          ],
          correctOptionIndex: 0,
          explanation: 'Functions return control and return values back to their caller upon completion.',
        },
        detectiveNotes: {
          note: `Function ${targetSym.name}() is located in ${symFile} (Lines ${targetSym.startLine}-${targetSym.endLine}).`,
          evidence: `AST symbol table entry for ${targetSym.name}.`,
          suspicious: 'Keep functions focused on a single responsibility to simplify testing.',
          beginnerTip: 'Think of functions as tiny machines: Input → Machine → Output.',
        },
      },
      evidence: [
        {
          file: symFile,
          startLine: targetSym.startLine,
          endLine: targetSym.endLine,
          symbolName: targetSym.name,
          snippet: `// Function ${targetSym.name}() in ${symFile}`,
        },
      ],
      investigationType: 'CALL_FLOW',
      interactiveQuestion: {
        id: 'q_lvl6_1',
        type: 'REASONING',
        prompt: `Which source file contains the implementation of ${targetSym.name}()?`,
        options: [symFile, 'unrelated_script.js', 'styles.css'],
        expectedAnswerHint: symFile,
        explanation: `Static AST symbol discovery locates ${targetSym.name}() inside ${symFile}.`,
        relatedConceptNames: ['Function / Method'],
        rubric: {
          keyPoints: [symFile, targetSym.name],
          misconceptions: ['Guessing unverified file paths'],
        },
      },
      estimatedMinutes: 7,
    });
  }

  // -------------------------------------------------------------
  // Level 10: Modifying the Project & Blast Radius
  // -------------------------------------------------------------
  lessons.push({
    projectId,
    level: 10,
    order: 8,
    title: 'Modifying the System: Blast Radius & Refactoring',
    objective: 'Assess how changes or deletions impact upstream and downstream dependents.',
    type: 'MODIFICATION',
    difficulty: 'ADVANCED',
    prerequisites: ['Modular Architecture & Dependency Graph'],
    content: {
      level: 10,
      caseClue: '🕵️ CASE CLUE: A master detective always calculates the blast radius before altering evidence.',
      whyMatters: 'Safe engineering requires knowing what breaks before writing a single line of code.',
      whatInvestigating: `Blast radius analysis upon modifying ${topCoreFile}.`,
      simpleExplanation: 'Changing a shared file is like pulling a brick from a Jenga tower. You need to know which other files depend on it so you can fix them too.',
      technicalExplanation: 'Blast radius traversal inspects reverse import edges and call sites to calculate direct and transitive breakage.',
      whyCare: {
        whatIsIt: 'Blast radius impact evaluation.',
        whatDoesItDo: 'Calculates all direct and indirect modules affected by modifying a component.',
        whyExists: 'To prevent accidental regressions and broken downstream dependencies.',
        whatUsesIt: 'Refactoring tools, regression testing, and code review.',
        whatDoesItUse: 'Static import dependency graphs and symbol call graphs.',
        whatBreaksWithoutIt: 'Modifying core files causes unexpected failures in distant modules.',
      },
      conceptCard: {
        name: 'BLAST RADIUS / DEPENDENCY GRAPH',
        category: 'ARCHITECTURE',
        whatItIs: 'The ripple effect of changes across dependent files in a codebase.',
        whyExists: 'To map dependencies so engineers can refactor safely without breaking callers.',
        whatDoingHere: `Calculates impact if ${topCoreFile} is modified or refactored.`,
      },
      neighborhood: [
        { name: topCoreFile, type: 'FILE', relationship: 'CURRENT' },
        { name: primaryEntry, type: 'FILE', relationship: 'IMPORTED_BY' },
      ],
      evidence: [{ file: topCoreFile, startLine: 1, endLine: 20, snippet: `// Blast Radius Target: ${topCoreFile}` }],
      connections: {
        upstream: ['Direct Dependents'],
        downstream: ['Transitive Consumers'],
        relatedSubsystems: ['All Dependent Modules'],
      },
      example: 'Renaming an exported function breaks all files importing that symbol.',
      recap: ['Always check the blast radius before modifying core shared interfaces'],
      completionCriteria: ['Calculate the blast radius of a module modification'],
      whatIfScenario: {
        question: `If an exported function in ${topCoreFile} is deleted, which files break first?`,
        options: [
          'Direct dependents that import that specific exported function',
          'Unrelated configuration files in other directories',
          'No files break because imports are decorative',
        ],
        correctAnswer: 'Direct dependents that import that specific exported function',
        explanation: 'Direct import relationships suffer immediate module resolution failures.',
      },
      predictNext: {
        prompt: 'What is the safest step after modifying a shared function signature?',
        options: [
          'Update all caller call sites and run regression tests',
          'Ignore callers and deploy immediately to production',
          'Delete unit tests that complain about errors',
        ],
        correctOptionIndex: 0,
        explanation: 'Refactoring requires updating all dependent call sites to match the updated contract.',
      },
      detectiveNotes: {
        note: 'Blast radius analysis prevents unexpected production outages during refactoring.',
        evidence: 'Reverse dependency graph traversal.',
        suspicious: 'High incoming reference counts indicate files requiring extra refactoring caution.',
        beginnerTip: 'Check who uses a tool before throwing it away!',
      },
    },
    evidence: [{ file: topCoreFile, startLine: 1, endLine: 20, snippet: `// Blast Radius: ${topCoreFile}` }],
    investigationType: 'BLAST_RADIUS',
    interactiveQuestion: {
      id: 'q_lvl10_1',
      type: 'IMPACT',
      prompt: `If an exported function signature in ${topCoreFile} is modified without updating callers, what happens?`,
      options: [
        'Direct dependents importing that function will fail to compile or throw runtime errors',
        'The application automatically fixes all calling code without errors',
        'Nothing breaks because imports are purely decorative',
      ],
      expectedAnswerHint: 'Direct dependents importing that function will fail to compile or throw runtime errors',
      explanation: 'Type contracts and static imports enforce signature parity; altering an export directly breaks callers.',
      relatedConceptNames: ['Blast Radius / Dependency Graph'],
      rubric: {
        keyPoints: ['direct dependents fail', 'compile or runtime errors'],
        misconceptions: ['Assuming automatic caller refactoring'],
      },
    },
    estimatedMinutes: 8,
  });

  return lessons;
}
