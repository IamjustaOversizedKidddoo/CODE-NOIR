import { ReadmeAnalysis, ReadmeSection } from '../types/intelligence';

/**
 * Finds the primary README file from a list of documentation files.
 */
export function detectPrimaryReadme(
  docFiles: { path: string; content: string }[]
): { path: string; content: string } | null {
  if (!docFiles || docFiles.length === 0) return null;

  // Search precedence for primary README
  const exactMatches = ['readme.md', 'readme', 'readme.txt', 'readme.rst'];
  for (const match of exactMatches) {
    const found = docFiles.find((d) => d.path.toLowerCase().split('/').pop() === match);
    if (found) return found;
  }

  // Fallback: any file with 'readme' in basename
  const fallback = docFiles.find((d) => d.path.toLowerCase().includes('readme'));
  return fallback || null;
}

/**
 * Extracts structured evidence from a repository's primary README.
 */
export function analyzeReadme(docFiles: { path: string; content: string }[]): ReadmeAnalysis {
  const primaryReadme = detectPrimaryReadme(docFiles);

  if (!primaryReadme || !primaryReadme.content || primaryReadme.content.trim() === '') {
    return {
      found: false,
      features: [],
      techStack: [],
      prerequisites: [],
      installationSteps: [],
      dependencyInstructions: [],
      configuration: [],
      environmentVariables: [],
      databaseSetup: [],
      runCommands: [],
      buildCommands: [],
      testingInstructions: [],
      deploymentInfo: [],
      warningsAndNotes: [],
      sections: [],
      undocumentedAspects: [
        'Project Purpose: Not documented (No README found)',
        'Installation & Setup: Not documented in README',
        'Environment Variables: Not documented in README',
        'Database Requirements: Not documented in README',
        'Run & Build Commands: Not documented in README',
      ],
    };
  }

  const content = primaryReadme.content;
  const lines = content.split('\n');

  // 1. Break into Markdown Sections (#, ##, ###)
  const sections: ReadmeSection[] = [];
  let currentSectionTitle = 'Overview';
  let currentSectionLines: string[] = [];

  for (const line of lines) {
    const headerMatch = line.match(/^#{1,4}\s+(.+)$/);
    if (headerMatch) {
      if (currentSectionLines.length > 0 || currentSectionTitle !== 'Overview') {
        sections.push({
          title: currentSectionTitle.trim(),
          content: currentSectionLines.join('\n').trim(),
        });
      }
      currentSectionTitle = headerMatch[1].replace(/[*_`]/g, '').trim();
      currentSectionLines = [];
    } else {
      currentSectionLines.push(line);
    }
  }

  if (currentSectionLines.length > 0) {
    sections.push({
      title: currentSectionTitle.trim(),
      content: currentSectionLines.join('\n').trim(),
    });
  }

  // 2. Extract Project Name (first # header or title)
  let projectName: string | undefined = undefined;
  const firstHeader = lines.find((l) => l.startsWith('# '));
  if (firstHeader) {
    projectName = firstHeader.replace(/^#\s+/, '').replace(/[*_`]/g, '').trim();
  }

  // 3. Extract Purpose / Description
  let purpose: string | undefined = undefined;
  let description: string | undefined = undefined;

  const overviewSec = sections.find((s) => /overview|about|description|introduction|summary/i.test(s.title)) || sections[0];
  if (overviewSec && overviewSec.content) {
    const paragraphs = overviewSec.content
      .split('\n\n')
      .map((p) => p.trim())
      .filter((p) => p && !p.startsWith('#') && !p.startsWith('![') && !p.startsWith('[!'));

    if (paragraphs.length > 0) {
      purpose = paragraphs[0].replace(/\n/g, ' ').slice(0, 300);
      description = paragraphs.slice(0, 3).join('\n\n').slice(0, 800);
    }
  }

  // Helper to extract bullet items from matching sections
  const extractBulletItems = (titleRegex: RegExp): string[] => {
    const items: string[] = [];
    const matchingSecs = sections.filter((s) => titleRegex.test(s.title));

    for (const sec of matchingSecs) {
      const secLines = sec.content.split('\n');
      for (const line of secLines) {
        const bulletMatch = line.match(/^\s*[-*+]\s+(.+)$/);
        if (bulletMatch) {
          items.push(bulletMatch[1].replace(/[*_`]/g, '').trim());
        }
      }
    }
    return items;
  };

  // Helper to extract code block commands from matching sections
  const extractCommands = (titleRegex: RegExp): string[] => {
    const commands: string[] = [];
    const matchingSecs = sections.filter((s) => titleRegex.test(s.title));

    for (const sec of matchingSecs) {
      const codeBlocks = sec.content.match(/```(?:bash|sh|cmd|powershell|zsh)?\n([\s\S]*?)\n```/gi) || [];
      for (const block of codeBlocks) {
        const cleanBlock = block.replace(/```[a-z]*\n?/gi, '').replace(/```/g, '');
        cleanBlock.split('\n').forEach((cmd) => {
          const trimmedCmd = cmd.trim().replace(/^\$\s*/, '');
          if (trimmedCmd && !trimmedCmd.startsWith('#')) {
            commands.push(trimmedCmd);
          }
        });
      }

      // Also scan inline code statements like `npm run dev`
      const inlineMatches = sec.content.match(/`(npm|pnpm|yarn|python|python3|pip|cargo|go|docker|make|npx)\s+[^`]+`/gi) || [];
      inlineMatches.forEach((m) => {
        const clean = m.replace(/`/g, '').trim();
        if (!commands.includes(clean)) commands.push(clean);
      });
    }
    return commands;
  };

  // 4. Feature Extraction
  const features = extractBulletItems(/feature|key feature|what it does|capabilities|highlight/i);

  // 5. Tech Stack Extraction
  const techStack = extractBulletItems(/tech|stack|built with|technology|library|framework/i);

  // 6. Prerequisites Extraction
  const prerequisites = extractBulletItems(/prerequisite|requirement|system requirement|before you begin/i);

  // 7. Installation & Setup Steps
  const installationSteps = extractBulletItems(/install|getting started|setup|quick start|building/i);
  const dependencyInstructions = extractCommands(/install|getting started|setup|dependency|dependencies/i);

  // 8. Configuration & Env Vars
  const configLines = extractBulletItems(/config|environment|env|setting/i);
  const envVarMatches = content.match(/\b[A-Z0-9_]{3,30}\b=(?:[^\n]*)/g) || [];
  const environmentVariables: string[] = Array.from(
    new Set(
      (content.match(/\b[A-Z0-9_]{3,30}\b(?=\s*=|\s*:|\s+in\s+|\s+is\s+)/g) || [])
        .filter((v) => /^(PORT|DATABASE|DB|POSTGRES|MYSQL|REDIS|API|KEY|SECRET|TOKEN|URL|HOST|NODE_ENV|NEXT|REACT|AUTH)/i.test(v))
    )
  );

  // 9. Database Setup Requirements
  const databaseSec = sections.filter((s) => /database|db|migration|prisma|sqlite|postgres/i.test(s.title));
  const databaseSetup: string[] = [];
  for (const sec of databaseSec) {
    const lines = sec.content.split('\n').map((l) => l.trim()).filter((l) => l.length > 0);
    databaseSetup.push(...lines.slice(0, 5));
  }

  // 10. Run & Build Commands
  const runCommands = extractCommands(/run|usage|start|development|demo|execut/i);
  const buildCommands = extractCommands(/build|compile|pack|dist/i);
  const testingInstructions = extractCommands(/test|spec|testing|vitest|jest|pytest/i);
  const deploymentInfo = extractBulletItems(/deploy|deployment|hosting|production|docker/i);

  // 11. Warnings & Notes
  const warningsAndNotes: string[] = [];
  for (const sec of sections) {
    const warnLines = sec.content
      .split('\n')
      .filter((l) => /warning|caution|important|note:|security/i.test(l));
    warningsAndNotes.push(...warnLines.map((l) => l.trim()));
  }

  // 12. Determine Undocumented Aspects
  const undocumentedAspects: string[] = [];
  if (features.length === 0) undocumentedAspects.push('Features List: Not documented in README');
  if (prerequisites.length === 0) undocumentedAspects.push('Prerequisites: Not documented in README');
  if (installationSteps.length === 0 && dependencyInstructions.length === 0) {
    undocumentedAspects.push('Installation & Dependency Instructions: Not documented in README');
  }
  if (environmentVariables.length === 0 && configLines.length === 0) {
    undocumentedAspects.push('Environment Variables: Not documented in README');
  }
  if (databaseSetup.length === 0) undocumentedAspects.push('Database Requirements: Not documented in README');
  if (runCommands.length === 0) undocumentedAspects.push('Run Commands: Not documented in README');
  if (buildCommands.length === 0) undocumentedAspects.push('Build Commands: Not documented in README');
  if (testingInstructions.length === 0) undocumentedAspects.push('Testing Instructions: Not documented in README');
  if (deploymentInfo.length === 0) undocumentedAspects.push('Deployment Info: Not documented in README');

  return {
    filePath: primaryReadme.path,
    found: true,
    projectName,
    purpose,
    description,
    features,
    techStack,
    prerequisites,
    installationSteps,
    dependencyInstructions,
    configuration: configLines,
    environmentVariables,
    databaseSetup,
    runCommands,
    buildCommands,
    testingInstructions,
    deploymentInfo,
    warningsAndNotes,
    sections,
    undocumentedAspects,
  };
}
