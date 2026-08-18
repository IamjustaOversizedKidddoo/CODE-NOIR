import fs from 'fs';
import path from 'path';
import prisma from '../src/lib/db';
import { runDirectFilesIngestionPipeline, DirectFileInput } from '../src/lib/ingestion/pipeline';
import { runInvestigation } from '../src/lib/investigation/engine';
import { getOrCreateLearningPath } from '../src/lib/teaching/engine';
import { runInterrogationPipeline } from '../src/lib/ai/pipeline';

async function main() {
  console.log('=== 1. REPRODUCE INGESTION ===');
  const baseDir = path.resolve('tests/fixtures/test-project');
  const relativeFiles = [
    'package.json',
    'README.md',
    'src/auth.ts',
    'src/user.ts',
    'src/database.ts'
  ];

  const directInputs: DirectFileInput[] = relativeFiles.map(rel => ({
    relativePath: rel,
    buffer: fs.readFileSync(path.join(baseDir, rel))
  }));

  const ingestionResult = await runDirectFilesIngestionPipeline(directInputs, {
    projectName: 'QA Test Project'
  });

  console.log('Ingestion Result:', {
    projectId: ingestionResult.projectId,
    caseNumber: ingestionResult.caseNumber,
    totalFiles: ingestionResult.totalFiles,
    includedFiles: ingestionResult.includedFiles
  });

  const caseId = ingestionResult.projectId;

  console.log('\n=== 2. VERIFY INGESTION IN DB ===');
  const dbProject = await prisma.project.findUnique({
    where: { id: caseId },
    include: {
      files: true,
      symbols: true,
      dependencies: true,
    }
  });

  const dbCallEdges = await prisma.callEdge.findMany({
    where: { projectId: caseId }
  });

  console.log('DB Project Status:', dbProject?.status);
  console.log('Files created:', dbProject?.files.map(f => f.path));
  console.log('Symbols created:', dbProject?.symbols.map(s => ({ name: s.name, kind: s.kind, file: s.fileId })));
  console.log('Dependencies created:', dbProject?.dependencies.map(d => ({ source: d.sourceFileId, target: d.targetFileId, external: d.externalPackage })));
  console.log('CallEdges created:', dbCallEdges.map(c => ({ callerId: c.callerId, calleeId: c.calleeId, calleeName: c.calleeName, relationship: c.relationship })));

  console.log('\n=== 3. VERIFY SYMBOL DATA (authenticateUser) ===');
  const authSymbol = dbProject?.symbols.find(s => s.name === 'authenticateUser');
  if (!authSymbol) {
    console.error('CRITICAL BUG: authenticateUser symbol NOT FOUND!');
  } else {
    console.log('Symbol found:', authSymbol);
    const callers = dbCallEdges.filter(c => c.calleeId === authSymbol.id);
    const callees = dbCallEdges.filter(c => c.callerId === authSymbol.id);
    console.log('Callers of authenticateUser:', callers);
    console.log('Callees of authenticateUser:', callees);
  }

  console.log('\n=== 4. VERIFY INVESTIGATION ENGINE ===');
  const invCallFlow = await runInvestigation(caseId, { type: 'CALL_FLOW', targetEntity: 'authenticateUser' });
  console.log('CALL_FLOW Investigation Title:', invCallFlow.title);
  console.log('CALL_FLOW Steps:', JSON.stringify(invCallFlow.steps, null, 2));

  const invBlastRadius = await runInvestigation(caseId, { type: 'BLAST_RADIUS', targetEntity: 'verifyPassword' });
  console.log('BLAST_RADIUS Steps:', JSON.stringify(invBlastRadius.steps, null, 2));

  console.log('\n=== 5. VERIFY TEACHING / LEARNING PATH ===');
  const pathData = await getOrCreateLearningPath(caseId);
  console.log('Learning Path Title:', pathData.title);
  console.log('Modules count:', pathData.modules.length);
  for (const mod of pathData.modules) {
    console.log(`Module "${mod.title}" lessons count:`, mod.lessons.length);
    for (const l of mod.lessons) {
      console.log(`  - Lesson L${l.level}: "${l.title}" (Evidence count: ${l.evidence.length})`);
      if (l.evidence.length > 0) {
        console.log(`    First evidence: ${JSON.stringify(l.evidence[0])}`);
      }
    }
  }

  console.log('\n=== 6. VERIFY INTERROGATION PIPELINE ===');
  try {
    const interrogateRes = await runInterrogationPipeline(caseId, 'What does authenticateUser do?');
    console.log('Interrogation response:', JSON.stringify(interrogateRes.response, null, 2));
  } catch (err: any) {
    console.error('Interrogation Error:', err);
  }
}

main().catch(console.error);
