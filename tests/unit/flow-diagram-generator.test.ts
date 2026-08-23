import { describe, it, expect } from 'vitest';
import {
  generateArchitectureFlowDiagram,
  generateInstallationFlowDiagram,
} from '@/lib/investigation/generators/flow-diagram-generator';

describe('Flow Diagram Generator: Architecture & Installation Flows', () => {
  const sampleProjectData = {
    name: 'Sample Auth App',
    primaryLang: 'TypeScript',
    files: [
      { id: 'f1', path: 'src/index.ts', lineCount: 50 },
      { id: 'f2', path: 'src/app/page.tsx', lineCount: 120 },
      { id: 'f3', path: 'src/api/auth.ts', lineCount: 80 },
      { id: 'f4', path: 'prisma/schema.prisma', lineCount: 40 },
      { id: 'f5', path: 'package-lock.json', lineCount: 500 },
    ],
    symbols: [
      { id: 's1', name: 'main', kind: 'FUNCTION', fileId: 'f1' },
      { id: 's2', name: 'authenticateUser', kind: 'FUNCTION', fileId: 'f3' },
    ],
    dependencies: [{ sourceFileId: 'f2', targetFileId: 'f3' }],
    entryPoints: [{ path: 'src/index.ts', reason: 'Explicit entry point' }],
    endpoints: [{ method: 'POST', path: '/api/auth/login', framework: 'Next.js' }],
    envVars: [{ name: 'DATABASE_URL', line: 5, evidence: 'process.env.DATABASE_URL' }],
    dbEvidence: [{ system: 'Prisma', operation: 'findUnique', line: 12, evidence: 'prisma.user.findUnique()' }],
    techProfile: {
      frameworks: [{ name: 'Next.js', confidence: 'CONFIRMED' }, { name: 'React', confidence: 'CONFIRMED' }],
      databases: [{ name: 'Prisma ORM', confidence: 'CONFIRMED' }],
      runtimes: [{ name: 'Node.js', evidence: 'package.json present' }],
      manifestsData: {
        packageJson: {
          name: 'sample-auth-app',
          scripts: {
            dev: 'next dev',
            build: 'next build',
            start: 'next start',
          },
        },
      },
    },
    brain: {
      readmeAnalysis: {
        found: true,
        dependencyInstructions: ['npm install'],
        runCommands: ['npm run dev'],
        buildCommands: ['npm run build'],
        prerequisites: ['Node.js >= 18'],
        environmentVariables: ['DATABASE_URL'],
      },
    },
  };

  it('should generate a valid Architecture Connection Flow diagram', () => {
    const diagram = generateArchitectureFlowDiagram('case-123', sampleProjectData as any);

    expect(diagram.type).toBe('ARCHITECTURE_FLOW');
    expect(diagram.nodes.length).toBeGreaterThan(3);

    const entryNode = diagram.nodes.find((n) => n.type === 'ENTRY_POINT');
    expect(entryNode).toBeDefined();
    expect(entryNode?.subtitle).toBe('src/index.ts');

    const frontendNode = diagram.nodes.find((n) => n.type === 'FRONTEND');
    expect(frontendNode).toBeDefined();

    const apiNode = diagram.nodes.find((n) => n.type === 'API');
    expect(apiNode).toBeDefined();

    const dbNode = diagram.nodes.find((n) => n.type === 'DATABASE_NODE');
    expect(dbNode).toBeDefined();

    expect(diagram.edges.length).toBeGreaterThan(2);
  });

  it('should generate a valid Installation & Execution Flow diagram with commands', () => {
    const diagram = generateInstallationFlowDiagram('case-123', sampleProjectData as any);

    expect(diagram.type).toBe('INSTALLATION_EXECUTION_FLOW');
    expect(diagram.nodes.length).toBe(6);

    const prereqStep = diagram.nodes.find((n) => n.type === 'PREREQUISITE');
    expect(prereqStep?.stepNumber).toBe(1);

    const installStep = diagram.nodes.find((n) => n.type === 'INSTALLATION');
    expect(installStep?.command).toBe('npm install');

    const dbStep = diagram.nodes.find((n) => n.type === 'DATABASE');
    expect(dbStep?.command).toBe('npx prisma db push');

    const runStep = diagram.nodes.find((n) => n.type === 'EXECUTION');
    expect(runStep?.command).toBe('npm run dev');
  });

  it('should detect README vs Package.json script discrepancies', () => {
    const conflictingData = {
      ...sampleProjectData,
      techProfile: {
        ...sampleProjectData.techProfile,
        manifestsData: {
          packageJson: {
            name: 'sample-auth-app',
            scripts: {
              dev: 'next dev', // No "start" script
            },
          },
        },
      },
      brain: {
        readmeAnalysis: {
          found: true,
          runCommands: ['npm start'], // README says npm start, but package.json lacks start script!
        },
      },
    };

    const diagram = generateInstallationFlowDiagram('case-123', conflictingData as any);
    const runStep = diagram.nodes.find((n) => n.type === 'EXECUTION');

    expect(runStep?.status).toBe('DISCREPANCY');
    expect(runStep?.discrepancyWarning).toContain('README instructs "npm start"');
    expect(diagram.warnings?.length).toBeGreaterThan(0);
  });
});
