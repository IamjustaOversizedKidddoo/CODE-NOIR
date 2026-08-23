import prisma from '../src/lib/db';
import { runGitHubIngestionPipeline } from '../src/lib/ingestion/pipeline';
import { generateArchitectureFlowDiagram, generateInstallationFlowDiagram } from '../src/lib/investigation/generators/flow-diagram-generator';

async function runEndToEndGitHubTest() {
  console.log('==================================================');
  console.log('E2E GITHUB REPOSITORY ANALYSIS TEST');
  console.log('Target Repository: https://github.com/expressjs/express');
  console.log('==================================================\n');

  const githubUrl = 'https://github.com/expressjs/express';

  // CHECK 1: GitHub Fetch & Ingestion
  console.log('[CHECK 1] Initiating GitHub Fetch & Ingestion Pipeline...');
  const startTime = Date.now();
  
  let ingestionResult;
  try {
    ingestionResult = await runGitHubIngestionPipeline(githubUrl);
    console.log(`✓ GitHub Fetch & Ingestion Successful in ${Date.now() - startTime}ms`);
    console.log(`  Case ID: ${ingestionResult.projectId}`);
    console.log(`  Case Number: ${ingestionResult.caseNumber}`);
    console.log(`  Total Files Discovered: ${ingestionResult.totalFiles}`);
    console.log(`  Included Active Files: ${ingestionResult.includedFiles}`);
    console.log(`  Primary Technology: ${ingestionResult.primaryLang}`);
  } catch (err: any) {
    console.error(`❌ Check 1 Failed: GitHub fetch or ingestion error: ${err.message}`);
    process.exit(1);
  }

  const projectId = ingestionResult.projectId;

  // Retrieve complete Project record from DB
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      files: true,
      symbols: true,
      dependencies: true,
    },
  });

  const callEdges = await prisma.callEdge.findMany({
    where: { projectId },
  });

  if (!project) {
    console.error('❌ DB Record not found for ingested project!');
    process.exit(1);
  }

  const brain = JSON.parse(project.brainJson || '{}');
  const readmeAnalysis = brain.readmeAnalysis || {};
  const techProfile = JSON.parse(project.techStack || '{}');
  const entryPoints = JSON.parse(project.entryPoints || '[]');
  const endpoints = JSON.parse(project.endpointsJson || '[]');
  const dbEvidence = JSON.parse(project.dbEvidenceJson || '[]');
  const envVars = JSON.parse(project.envVarsJson || '[]');

  // CHECK 2: README Analysis
  console.log('\n[CHECK 2] Evaluating README Analysis Output...');
  console.log(`  Found README: ${readmeAnalysis.found}`);
  console.log(`  Project Name: "${readmeAnalysis.projectName}"`);
  console.log(`  Purpose: "${readmeAnalysis.purpose?.slice(0, 150)}..."`);
  console.log(`  Features (${readmeAnalysis.features?.length || 0}): ${JSON.stringify(readmeAnalysis.features?.slice(0, 5))}`);
  console.log(`  Prerequisites: ${JSON.stringify(readmeAnalysis.prerequisites)}`);
  console.log(`  Dependency Instructions: ${JSON.stringify(readmeAnalysis.dependencyInstructions)}`);
  console.log(`  Installation Instructions: ${JSON.stringify(readmeAnalysis.installationInstructions)}`);
  console.log(`  Configuration Notes: ${JSON.stringify(readmeAnalysis.configurationNotes)}`);
  console.log(`  Environment Variables: ${JSON.stringify(readmeAnalysis.environmentVariables)}`);
  console.log(`  Run Commands: ${JSON.stringify(readmeAnalysis.runCommands)}`);
  console.log(`  Build Commands: ${JSON.stringify(readmeAnalysis.buildCommands)}`);
  console.log(`  Usage Instructions: ${JSON.stringify(readmeAnalysis.usageInstructions)}`);
  console.log(`  Important Notes: ${JSON.stringify(readmeAnalysis.importantNotes)}`);
  console.log(`  Undocumented Aspects: ${JSON.stringify(readmeAnalysis.undocumentedAspects)}`);

  // CHECK 3: Repository Analysis
  console.log('\n[CHECK 3] Evaluating Repository AST & Symbol Analysis...');
  console.log(`  Total Cataloged Files: ${project.files.length}`);
  console.log(`  Total Extracted Symbols: ${project.symbols.length}`);
  console.log(`  Total Resolved Dependencies: ${project.dependencies.length}`);
  console.log(`  Total Call Graph Edges: ${callEdges.length}`);
  console.log(`  Entry Points (${entryPoints.length}): ${JSON.stringify(entryPoints.map((e: any) => e.path))}`);
  console.log(`  Detected Frameworks: ${JSON.stringify(techProfile.frameworks?.map((f: any) => f.name))}`);
  console.log(`  Detected Package Managers: ${JSON.stringify(techProfile.packageManagers?.map((p: any) => p.name))}`);
  console.log(`  Major Top-Level Directories: ${JSON.stringify([...new Set(project.files.map(f => f.path.split('/')[0]))].filter(d => !d.includes('.')))}`);

  // CHECK 4: Architecture Diagram Generation
  console.log('\n[CHECK 4] Evaluating Architecture Diagram Generation...');
  const projectData = {
    name: project.name,
    primaryLang: project.primaryLang,
    files: project.files,
    symbols: project.symbols,
    dependencies: project.dependencies,
    entryPoints,
    endpoints,
    envVars,
    dbEvidence,
    techProfile,
    brain,
  };

  const archDiagram = generateArchitectureFlowDiagram(projectId, projectData as any);
  console.log(`  Diagram Type: ${archDiagram.type}`);
  console.log(`  Node Count: ${archDiagram.nodes.length}`);
  console.log(`  Edge Count: ${archDiagram.edges.length}`);
  archDiagram.nodes.forEach(n => console.log(`    Node [${n.type}]: ${n.title} (${n.subtitle}) -> Evidence: "${n.evidence}"`));
  archDiagram.edges.forEach(e => console.log(`    Edge: ${e.source} --(${e.label})--> ${e.target}`));

  // CHECK 5: Installation / Execution Diagram Generation
  console.log('\n[CHECK 5] Evaluating Installation & Execution Flow Diagram...');
  const installDiagram = generateInstallationFlowDiagram(projectId, projectData as any);
  console.log(`  Diagram Type: ${installDiagram.type}`);
  console.log(`  Step Nodes (${installDiagram.nodes.length}):`);
  installDiagram.nodes.forEach((node) => {
    console.log(`    Step ${node.stepNumber} [${node.type}]: ${node.title} -> Command: "${node.command}" (Status: ${node.status})`);
    if (node.discrepancyWarning) {
      console.log(`      ⚠️ Discrepancy Warning: ${node.discrepancyWarning}`);
    }
  });
  if (installDiagram.warnings && installDiagram.warnings.length > 0) {
    console.log(`  Total Warnings/Discrepancies: ${JSON.stringify(installDiagram.warnings)}`);
  }

  // CHECK 6: User Experience & Runtime Integrity
  console.log('\n[CHECK 6] Checking UI & Runtime Integrity...');
  console.log(`  Project DB Status: ${project.status}`);
  console.log(`  Status Message: "${project.statusMessage}"`);
  console.log(`  Progress: ${project.progress}%`);
  console.log(`  Storage Path: ${project.storagePath}`);

  console.log('\n==================================================');
  console.log('E2E TEST RUN COMPLETED SUCCESSFULLY');
  console.log('==================================================');

  // Cleanup created test project
  await prisma.project.delete({ where: { id: projectId } });
}

runEndToEndGitHubTest().catch((err) => {
  console.error('Fatal E2E Test Error:', err);
  process.exit(1);
});
