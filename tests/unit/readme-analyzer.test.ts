import { describe, it, expect } from 'vitest';
import { analyzeReadme, detectPrimaryReadme } from '@/lib/intelligence/readme-analyzer';

describe('README Analyzer: Evidence Extraction & Undocumented Detection', () => {
  it('should detect primary README.md file', () => {
    const docFiles = [
      { path: 'docs/architecture.md', content: 'Arch notes' },
      { path: 'README.md', content: '# Sample App\n\nThis app manages evidence files.' },
    ];
    const primary = detectPrimaryReadme(docFiles);
    expect(primary).not.toBeNull();
    expect(primary?.path).toBe('README.md');
  });

  it('should extract structured evidence from README content', () => {
    const readmeContent = `# CODE NOIR Detective App

## Overview
CODE NOIR is a static code intelligence engine designed for evidence-based repository investigation.

## Features
- Deterministic AST Parsing
- Grounded AI Interrogation
- Crime Scene Pinboard Graph

## Installation
\`\`\`bash
npm install
\`\`\`

## Usage
\`\`\`bash
npm run dev
\`\`\`
`;

    const docFiles = [{ path: 'README.md', content: readmeContent }];
    const analysis = analyzeReadme(docFiles);

    expect(analysis.found).toBe(true);
    expect(analysis.projectName).toBe('CODE NOIR Detective App');
    expect(analysis.purpose).toContain('static code intelligence engine');
    expect(analysis.features).toContain('Deterministic AST Parsing');
    expect(analysis.dependencyInstructions).toContain('npm install');
    expect(analysis.runCommands).toContain('npm run dev');
  });

  it('should mark missing information as undocumented aspects without hallucinating', () => {
    const docFiles = [{ path: 'README.md', content: '# Simple Project\n\nMinimal repository.' }];
    const analysis = analyzeReadme(docFiles);

    expect(analysis.found).toBe(true);
    expect(analysis.undocumentedAspects).toContain('Features List: Not documented in README');
    expect(analysis.undocumentedAspects).toContain('Environment Variables: Not documented in README');
    expect(analysis.undocumentedAspects).toContain('Database Requirements: Not documented in README');
  });

  it('should handle repository without README gracefully', () => {
    const analysis = analyzeReadme([]);
    expect(analysis.found).toBe(false);
    expect(analysis.undocumentedAspects).toContain('Project Purpose: Not documented (No README found)');
  });
});
