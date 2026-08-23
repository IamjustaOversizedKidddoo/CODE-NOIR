import { describe, it, expect } from 'vitest';
import { parseGitHubUrl, fetchGitHubRepositoryZipball } from '@/lib/ingestion/github-fetcher';


import { runGitHubIngestionPipeline } from '@/lib/ingestion/pipeline';
import { analyzeReadme } from '@/lib/intelligence/readme-analyzer';
import { generateArchitectureFlowDiagram, generateInstallationFlowDiagram } from '@/lib/investigation/generators/flow-diagram-generator';

describe('GitHub Repository Workflow End-to-End & Regression Pass', () => {
  it('1. GitHub URL Parsing & Security Validation', () => {
    const validUrl = 'https://github.com/facebook/react.git';
    const parsed = parseGitHubUrl(validUrl);
    expect(parsed.owner).toBe('facebook');
    expect(parsed.repo).toBe('react');

    // Invalid & SSRF URLs
    expect(() => parseGitHubUrl('http://169.254.169.254/secret')).toThrow();
    expect(() => parseGitHubUrl('https://evil-site.com/repo')).toThrow();
    expect(() => parseGitHubUrl('https://github.com/onlyowner')).toThrow();
  });

  it('2. README-First Analysis & Zero-Hallucination Integrity', () => {
    const docFiles = [
      {
        path: 'README.md',
        content: `# E2E Test App\n\n## Overview\nFullstack React & Node.js application.\n\n## Installation\n\`\`\`bash\nnpm install\n\`\`\`\n\n## Running\n\`\`\`bash\nnpm run dev\n\`\`\``,
      },
    ];

    const readme = analyzeReadme(docFiles);
    expect(readme.found).toBe(true);
    expect(readme.projectName).toBe('E2E Test App');
    expect(readme.purpose).toContain('Fullstack React & Node.js application');
    expect(readme.dependencyInstructions).toContain('npm install');
    expect(readme.runCommands).toContain('npm run dev');
    expect(readme.undocumentedAspects).toContain('Environment Variables: Not documented in README');
  });

  it('3. Visual Flow Diagrams Generation (Architecture & Installation)', () => {
    const projectPayload = {
      name: 'E2E Fullstack App',
      primaryLang: 'TypeScript',
      files: [
        { id: 'f1', path: 'src/index.ts', lineCount: 30 },
        { id: 'f2', path: 'src/app/page.tsx', lineCount: 100 },
        { id: 'f3', path: 'src/api/route.ts', lineCount: 50 },
        { id: 'f4', path: 'prisma/schema.prisma', lineCount: 20 },
      ],
      symbols: [],
      dependencies: [],
      entryPoints: [{ path: 'src/index.ts', reason: 'Front door' }],
      endpoints: [{ method: 'GET', path: '/api/health', framework: 'Next.js' }],
      envVars: [],
      dbEvidence: [{ system: 'Prisma', operation: 'findMany', line: 10, evidence: 'prisma.user.findMany()' }],
      techProfile: {
        frameworks: [{ name: 'Next.js', confidence: 'CONFIRMED' }],
        databases: [{ name: 'Prisma ORM', confidence: 'CONFIRMED' }],
        manifestsData: {
          packageJson: {
            name: 'e2e-app',
            scripts: { dev: 'next dev', build: 'next build', start: 'next start' },
          },
        },
      },
      brain: {
        readmeAnalysis: {
          found: true,
          dependencyInstructions: ['npm install'],
          runCommands: ['npm run dev'],
        },
      },
    };

    // Architecture Diagram
    const archDiagram = generateArchitectureFlowDiagram('case-e2e', projectPayload as any);
    expect(archDiagram.type).toBe('ARCHITECTURE_FLOW');
    expect(archDiagram.nodes.some((n) => n.type === 'ENTRY_POINT')).toBe(true);
    expect(archDiagram.nodes.some((n) => n.type === 'FRONTEND')).toBe(true);
    expect(archDiagram.nodes.some((n) => n.type === 'API')).toBe(true);
    expect(archDiagram.nodes.some((n) => n.type === 'DATABASE_NODE')).toBe(true);

    // Installation Diagram
    const installDiagram = generateInstallationFlowDiagram('case-e2e', projectPayload as any);
    expect(installDiagram.type).toBe('INSTALLATION_EXECUTION_FLOW');
    expect(installDiagram.nodes.find((n) => n.type === 'INSTALLATION')?.command).toBe('npm install');
    expect(installDiagram.nodes.find((n) => n.type === 'EXECUTION')?.command).toBe('npm run dev');
  });
});
