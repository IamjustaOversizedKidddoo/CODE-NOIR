import { VisualFlowDiagram, VisualFlowNode, VisualFlowEdge } from '../types';

/**
 * Generates Diagram 1: Project Architecture & Connection Flow.
 * Focuses on high-level system components (Frontend, APIs, Core Services, Auth, Database, External APIs).
 */
export function generateArchitectureFlowDiagram(
  projectId: string,
  projectData: {
    name: string;
    primaryLang: string;
    files: { id: string; path: string; lineCount: number }[];
    symbols: { id: string; name: string; kind: string; fileId: string }[];
    dependencies: { sourceFileId: string; targetFileId: string | null }[];
    entryPoints: { path: string; reason: string }[];
    endpoints: any[];
    envVars: any[];
    dbEvidence: any[];
    techProfile: any;
    brain: any;
  }
): VisualFlowDiagram {
  const nodes: VisualFlowNode[] = [];
  const edges: VisualFlowEdge[] = [];
  const warnings: string[] = [];

  const tech = projectData.techProfile || {};
  const entryPoints = projectData.entryPoints || [];
  const endpoints = projectData.endpoints || [];
  const dbEvidence = projectData.dbEvidence || [];
  const frameworks = tech.frameworks || [];
  const databases = tech.databases || [];

  // Node 1: Entry Point / Front Door
  const primaryEntry = entryPoints[0]?.path || projectData.files[0]?.path || 'src/index.ts';
  nodes.push({
    id: 'node-entry',
    title: 'APPLICATION ENTRY POINT',
    subtitle: primaryEntry,
    type: 'ENTRY_POINT',
    status: 'CONFIRMED',
    description: `Process execution originates at ${primaryEntry} (${entryPoints[0]?.reason || 'Discovered entry file'}).`,
    evidence: `File: ${primaryEntry}`,
  });

  // Node 2: Frontend UI Layer (if UI framework present)
  const isFrontendPresent =
    frameworks.some((f: any) => /react|next|vue|angular|tailwind/i.test(f.name)) ||
    projectData.files.some((f) => /src\/app|src\/pages|src\/components|components\//i.test(f.path));

  if (isFrontendPresent) {
    const frontendFw = frameworks.find((f: any) => /react|next|vue|angular/i.test(f.name))?.name || 'React / Next.js UI';
    nodes.push({
      id: 'node-frontend',
      title: 'FRONTEND UI LAYER',
      subtitle: frontendFw,
      type: 'FRONTEND',
      status: 'CONFIRMED',
      description: `Renders user interface components using ${frontendFw}.`,
      evidence: `Framework matches: ${frontendFw}`,
    });

    edges.push({
      id: 'edge-entry-frontend',
      source: 'node-entry',
      target: 'node-frontend',
      label: 'Initializes UI',
      relationship: 'INITIALIZES',
    });
  }

  // Node 3: API & Routing Layer
  const isApiPresent = endpoints.length > 0 || projectData.files.some((f) => /api\/|routes\/|controllers\//i.test(f.path));
  if (isApiPresent) {
    const apiDesc = endpoints.length > 0 ? `${endpoints.length} API endpoints indexed` : 'Router & controller layer';
    nodes.push({
      id: 'node-api',
      title: 'API & ROUTING LAYER',
      subtitle: apiDesc,
      type: 'API',
      status: 'CONFIRMED',
      description: `Handles incoming HTTP requests, route matching, and input payload processing.`,
      evidence: `Detected ${endpoints.length} API routes`,
    });

    edges.push({
      id: isFrontendPresent ? 'edge-frontend-api' : 'edge-entry-api',
      source: isFrontendPresent ? 'node-frontend' : 'node-entry',
      target: 'node-api',
      label: 'HTTP Requests',
      relationship: 'CALLS',
    });
  }

  // Node 4: Backend Business Services
  nodes.push({
    id: 'node-backend',
    title: 'BACKEND SERVICES & BUSINESS LOGIC',
    subtitle: `${projectData.primaryLang} Core`,
    type: 'SERVICE',
    status: 'CONFIRMED',
    description: `Executes core business logic, domain algorithms, and data transformations.`,
    evidence: `Primary Tech: ${projectData.primaryLang}`,
  });

  edges.push({
    id: isApiPresent ? 'edge-api-backend' : 'edge-entry-backend',
    source: isApiPresent ? 'node-api' : 'node-entry',
    target: 'node-backend',
    label: 'Invokes Service',
    relationship: 'CALLS',
  });

  // Node 5: Authentication & Security Boundary
  const isAuthPresent = projectData.files.some((f) => /auth|login|session|jwt|token|security/i.test(f.path));
  if (isAuthPresent) {
    nodes.push({
      id: 'node-auth',
      title: 'AUTHENTICATION & SECURITY',
      subtitle: 'Token / Session Guard',
      type: 'BACKEND',
      status: 'CONFIRMED',
      description: `Enforces user authorization, token verification, and security bounds.`,
      evidence: `Auth modules detected in repository`,
    });

    edges.push({
      id: 'edge-backend-auth',
      source: 'node-backend',
      target: 'node-auth',
      label: 'Verifies Credentials',
      relationship: 'AUTHENTICATES',
    });
  }

  // Node 6: Database & Persistence Layer
  const isDbPresent = databases.length > 0 || dbEvidence.length > 0 || projectData.files.some((f) => /prisma|schema|db\.ts|models\//i.test(f.path));
  if (isDbPresent) {
    const dbName = databases[0]?.name || dbEvidence[0]?.system || 'Database / Persistence Store';
    nodes.push({
      id: 'node-db',
      title: 'PERSISTENCE & DATABASE LAYER',
      subtitle: dbName,
      type: 'DATABASE_NODE',
      status: 'CONFIRMED',
      description: `Persists domain entities and state using ${dbName}.`,
      evidence: `Database client: ${dbName}`,
    });

    edges.push({
      id: 'edge-backend-db',
      source: 'node-backend',
      target: 'node-db',
      label: 'Queries State',
      relationship: 'DB_QUERY',
    });
  }

  return {
    projectId,
    title: `Architecture Connection Diagram: ${projectData.name}`,
    type: 'ARCHITECTURE_FLOW',
    description: `High-level component connection flow for ${projectData.name} based on evidence-backed AST parsing.`,
    nodes,
    edges,
    warnings,
  };
}

/**
 * Generates Diagram 2: Installation & Execution Flow.
 * Maps step-by-step developer setup (Prerequisites -> Install -> Config -> Database -> Build -> Run).
 * Flags README vs Package manifest command discrepancies.
 */
export function generateInstallationFlowDiagram(
  projectId: string,
  projectData: {
    name: string;
    primaryLang: string;
    files: { id: string; path: string; lineCount: number }[];
    techProfile: any;
    brain: any;
  }
): VisualFlowDiagram {
  const nodes: VisualFlowNode[] = [];
  const edges: VisualFlowEdge[] = [];
  const warnings: string[] = [];

  const brain = projectData.brain || {};
  const readme = brain.readmeAnalysis || {};
  const tech = projectData.techProfile || {};
  const manifestsData = tech.manifestsData || {};
  const packageJson = manifestsData.packageJson || {};
  const scripts = packageJson.scripts || {};

  // Detect Package Manager Ecosystem
  let packageManager = 'npm';
  if (projectData.files.some((f) => f.path === 'pnpm-lock.yaml')) packageManager = 'pnpm';
  else if (projectData.files.some((f) => f.path === 'yarn.lock')) packageManager = 'yarn';
  else if (projectData.files.some((f) => f.path === 'poetry.lock' || f.path === 'pyproject.toml')) packageManager = 'poetry';
  else if (projectData.files.some((f) => f.path === 'requirements.txt')) packageManager = 'pip';
  else if (projectData.files.some((f) => f.path === 'Cargo.toml')) packageManager = 'cargo';
  else if (projectData.files.some((f) => f.path === 'go.mod')) packageManager = 'go';

  let stepCounter = 1;

  // STEP 1: PREREQUISITES
  const runtimes = tech.runtimes || [];
  const reqPrereqs = readme.prerequisites || [];
  const prereqTitle = runtimes[0]?.name || (projectData.primaryLang + ' Environment');
  nodes.push({
    id: 'step-1-prereq',
    title: 'PREREQUISITES',
    subtitle: prereqTitle,
    type: 'PREREQUISITE',
    stepNumber: stepCounter++,
    status: 'CONFIRMED',
    description: reqPrereqs.length > 0 ? reqPrereqs.join(', ') : `Requires ${prereqTitle} installed on host machine.`,
    evidence: `Runtime detected: ${prereqTitle}`,
  });

  // STEP 2: INSTALL DEPENDENCIES
  let installCmd = readme.dependencyInstructions?.[0];
  let installStatus: VisualFlowNode['status'] = 'CONFIRMED';
  let installDiscrepancy: string | undefined = undefined;

  if (!installCmd) {
    if (packageManager === 'npm') installCmd = 'npm install';
    else if (packageManager === 'yarn') installCmd = 'yarn install';
    else if (packageManager === 'pnpm') installCmd = 'pnpm install';
    else if (packageManager === 'pip') installCmd = 'pip install -r requirements.txt';
    else if (packageManager === 'poetry') installCmd = 'poetry install';
    else if (packageManager === 'cargo') installCmd = 'cargo build';
    else if (packageManager === 'go') installCmd = 'go mod download';
    else installCmd = 'Not documented in README';
  }

  // Check discrepancy: README says yarn but lockfile is package-lock.json
  if (installCmd.includes('yarn') && projectData.files.some((f) => f.path === 'package-lock.json') && !projectData.files.some((f) => f.path === 'yarn.lock')) {
    installStatus = 'DISCREPANCY';
    installDiscrepancy = 'README specifies yarn, but repository contains package-lock.json without yarn.lock.';
    warnings.push(installDiscrepancy);
  }

  nodes.push({
    id: 'step-2-install',
    title: 'INSTALL DEPENDENCIES',
    subtitle: `Package Manager: ${packageManager.toUpperCase()}`,
    type: 'INSTALLATION',
    stepNumber: stepCounter++,
    status: installStatus,
    command: installCmd,
    packageManager,
    description: `Install required library packages using ${packageManager}.`,
    evidence: `Manifest match: ${packageManager}`,
    discrepancyWarning: installDiscrepancy,
  });

  edges.push({
    id: 'edge-1-2',
    source: 'step-1-prereq',
    target: 'step-2-install',
  });

  // STEP 3: CONCONFIGURE ENVIRONMENT
  const hasEnvExample = projectData.files.some((f) => f.path.includes('.env.example') || f.path.includes('.env.template'));
  const envVars = readme.environmentVariables || [];
  let configCmd = hasEnvExample ? 'cp .env.example .env' : envVars.length > 0 ? 'Create .env file' : 'Not required';

  nodes.push({
    id: 'step-3-config',
    title: 'CONFIGURE ENVIRONMENT',
    subtitle: hasEnvExample ? '.env.example detected' : 'Environment Variables',
    type: 'CONFIGURATION',
    stepNumber: stepCounter++,
    status: hasEnvExample || envVars.length > 0 ? 'CONFIRMED' : 'OPTIONAL',
    command: configCmd,
    description: hasEnvExample
      ? 'Copy template environment file and set API keys / secrets.'
      : 'Set environment variables if required by target environment.',
    evidence: hasEnvExample ? 'Found .env.example' : 'Static analysis',
  });

  edges.push({
    id: 'edge-2-3',
    source: 'step-2-install',
    target: 'step-3-config',
  });

  // STEP 4: DATABASE SETUP & MIGRATIONS
  const hasPrisma = projectData.files.some((f) => f.path.includes('schema.prisma'));
  const hasDjangoMigrate = projectData.files.some((f) => f.path === 'manage.py');
  let dbCmd = 'Not required';
  let dbStatus: VisualFlowNode['status'] = 'OPTIONAL';

  if (hasPrisma) {
    dbCmd = 'npx prisma db push';
    dbStatus = 'CONFIRMED';
  } else if (hasDjangoMigrate) {
    dbCmd = 'python manage.py migrate';
    dbStatus = 'CONFIRMED';
  } else if (readme.databaseSetup?.[0]) {
    dbCmd = readme.databaseSetup[0];
    dbStatus = 'CONFIRMED';
  }

  nodes.push({
    id: 'step-4-database',
    title: 'DATABASE SETUP',
    subtitle: hasPrisma ? 'Prisma Schema' : hasDjangoMigrate ? 'Django Migrations' : 'Database Persistence',
    type: 'DATABASE',
    stepNumber: stepCounter++,
    status: dbStatus,
    command: dbCmd,
    description: dbStatus === 'CONFIRMED' ? 'Initialize database tables and run schema migrations.' : 'No database migrations required.',
    evidence: hasPrisma ? 'Found schema.prisma' : 'Manifest check',
  });

  edges.push({
    id: 'edge-3-4',
    source: 'step-3-config',
    target: 'step-4-database',
  });

  // STEP 5: BUILD APPLICATION
  let buildCmd = readme.buildCommands?.[0];
  let buildStatus: VisualFlowNode['status'] = 'CONFIRMED';
  let buildDiscrepancy: string | undefined = undefined;

  if (!buildCmd) {
    if (scripts.build) {
      buildCmd = `${packageManager} run build`;
    } else {
      buildCmd = 'Not required / Interpreted';
      buildStatus = 'OPTIONAL';
    }
  } else {
    // Check discrepancy: README says npm run build, but scripts.build is missing in package.json
    if (buildCmd.includes('run build') && packageJson.name && !scripts.build) {
      buildStatus = 'DISCREPANCY';
      buildDiscrepancy = 'README specifies "npm run build", but package.json contains no "build" script.';
      warnings.push(buildDiscrepancy);
    }
  }

  nodes.push({
    id: 'step-5-build',
    title: 'BUILD APPLICATION',
    subtitle: scripts.build ? 'Production Bundle' : 'Build Step',
    type: 'BUILD',
    stepNumber: stepCounter++,
    status: buildStatus,
    command: buildCmd,
    description: buildStatus === 'OPTIONAL' ? 'Interpreted / JIT project; no explicit compilation step required.' : 'Compile source files into production assets.',
    evidence: scripts.build ? 'package.json "build" script' : 'Manifest check',
    discrepancyWarning: buildDiscrepancy,
  });

  edges.push({
    id: 'edge-4-5',
    source: 'step-4-database',
    target: 'step-5-build',
  });

  // STEP 6: START APPLICATION / RUN SERVER
  let runCmd = readme.runCommands?.[0];
  let runStatus: VisualFlowNode['status'] = 'CONFIRMED';
  let runDiscrepancy: string | undefined = undefined;

  if (!runCmd) {
    if (scripts.dev) runCmd = `${packageManager} run dev`;
    else if (scripts.start) runCmd = `${packageManager} start`;
    else if (projectData.files.some((f) => f.path === 'app.py')) runCmd = 'python app.py';
    else if (projectData.files.some((f) => f.path === 'main.go')) runCmd = 'go run main.go';
    else runCmd = 'Unknown / Not documented';
  } else {
    // Check discrepancy: README says npm start, but package.json only has dev script
    if (runCmd.includes('start') && packageJson.name && !scripts.start && scripts.dev) {
      runStatus = 'DISCREPANCY';
      runDiscrepancy = 'README instructs "npm start", but package.json contains no "start" script (only "dev"). Use "npm run dev".';
      warnings.push(runDiscrepancy);
    }
  }

  nodes.push({
    id: 'step-6-run',
    title: 'START APPLICATION',
    subtitle: 'Development / Production Server',
    type: 'EXECUTION',
    stepNumber: stepCounter++,
    status: runStatus,
    command: runCmd,
    description: 'Launch application server and listen for incoming connections.',
    evidence: scripts.dev ? 'package.json script' : 'README / Entry point',
    discrepancyWarning: runDiscrepancy,
  });

  edges.push({
    id: 'edge-5-6',
    source: 'step-5-build',
    target: 'step-6-run',
  });

  return {
    projectId,
    title: `Installation & Execution Flow: ${projectData.name}`,
    type: 'INSTALLATION_EXECUTION_FLOW',
    description: `Step-by-step local execution flow for ${projectData.name} based on package manifests and README evidence.`,
    nodes,
    edges,
    warnings,
  };
}
