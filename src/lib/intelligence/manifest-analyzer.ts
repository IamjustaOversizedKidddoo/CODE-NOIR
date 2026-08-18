import { TechnologyProfile } from '../types/intelligence';

export interface ParsedManifestData {
  packageJson?: {
    name?: string;
    version?: string;
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
    scripts?: Record<string, string>;
    main?: string;
  };
  tsconfig?: {
    compilerOptions?: {
      baseUrl?: string;
      paths?: Record<string, string[]>;
    };
  };
  pyprojectToml?: string;
  requirementsTxt?: string[];
  cargoToml?: string;
  goMod?: string;
  dockerfile?: string;
}

export function analyzeManifests(
  manifestFiles: { path: string; content: string }[],
  languageMetrics: { name: string; fileCount: number; lineCount: number }[]
): { profile: TechnologyProfile; pathAliases: Record<string, string[]>; manifestsData: Record<string, any> } {
  const totalFiles = languageMetrics.reduce((acc, l) => acc + l.fileCount, 0) || 1;

  const languagesWithPct = languageMetrics.map((l) => ({
    ...l,
    percentage: Math.round((l.fileCount / totalFiles) * 100),
  }));

  const profile: TechnologyProfile = {
    languages: languagesWithPct,
    frameworks: [],
    runtimes: [],
    packageManagers: [],
    databases: [],
  };

  const pathAliases: Record<string, string[]> = {};
  const manifestsData: Record<string, any> = {};

  const detectedDeps = new Set<string>();

  for (const file of manifestFiles) {
    const baseName = file.path.split('/').pop()?.toLowerCase() || '';

    // 1. package.json analysis
    if (baseName === 'package.json') {
      try {
        const pkg = JSON.parse(file.content);
        manifestsData.packageJson = {
          name: pkg.name,
          version: pkg.version,
          dependencies: pkg.dependencies,
          devDependencies: pkg.devDependencies,
          scripts: pkg.scripts,
        };

        const allDeps = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) };
        Object.keys(allDeps).forEach((dep) => detectedDeps.add(dep.toLowerCase()));

        profile.runtimes.push({
          name: 'Node.js',
          evidence: 'package.json present with JavaScript/TypeScript dependencies',
        });
        profile.packageManagers.push({
          name: 'npm / pnpm / yarn',
          evidence: 'package.json found in project root',
        });
      } catch {
        // malformed json handled safely as data
      }
    }

    // 2. tsconfig.json analysis
    if (baseName === 'tsconfig.json') {
      try {
        // Strip single line comments from JSON
        const sanitized = file.content.replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');
        const tsconfig = JSON.parse(sanitized);
        if (tsconfig.compilerOptions?.paths) {
          Object.assign(pathAliases, tsconfig.compilerOptions.paths);
        }
        manifestsData.tsconfig = {
          paths: tsconfig.compilerOptions?.paths,
          target: tsconfig.compilerOptions?.target,
        };
      } catch {
        // Malformed comments in tsconfig
      }
    }

    // 3. requirements.txt / pyproject.toml
    if (baseName === 'requirements.txt') {
      const lines = file.content
        .split('\n')
        .map((l) => l.trim().split(/[=><~]/)[0].toLowerCase())
        .filter((l) => l && !l.startsWith('#'));
      lines.forEach((dep) => detectedDeps.add(dep));
      manifestsData.requirementsTxt = lines;

      profile.runtimes.push({
        name: 'Python 3',
        evidence: 'requirements.txt detected',
      });
      profile.packageManagers.push({
        name: 'pip',
        evidence: 'requirements.txt found',
      });
    }

    if (baseName === 'pyproject.toml') {
      manifestsData.pyprojectToml = file.content.slice(0, 1000);
      profile.packageManagers.push({
        name: 'Poetry / Flit / Pipenv',
        evidence: 'pyproject.toml found',
      });
      profile.runtimes.push({
        name: 'Python 3',
        evidence: 'pyproject.toml detected',
      });
    }

    // 4. Cargo.toml
    if (baseName === 'cargo.toml') {
      manifestsData.cargoToml = file.content.slice(0, 500);
      profile.packageManagers.push({
        name: 'Cargo',
        evidence: 'Cargo.toml found',
      });
      profile.runtimes.push({
        name: 'Rust Toolchain',
        evidence: 'Cargo.toml detected',
      });
    }

    // 5. go.mod
    if (baseName === 'go.mod') {
      manifestsData.goMod = file.content.slice(0, 500);
      profile.packageManagers.push({
        name: 'Go Modules',
        evidence: 'go.mod found',
      });
      profile.runtimes.push({
        name: 'Go Runtime',
        evidence: 'go.mod detected',
      });
    }

    // 6. Dockerfile / docker-compose
    if (baseName === 'dockerfile') {
      profile.runtimes.push({
        name: 'Docker / OCI Container',
        evidence: 'Dockerfile present in repository',
      });
    }
  }

  // Framework Detection Rule Matrix
  const FRAMEWORK_RULES: { name: string; triggers: string[]; db?: string }[] = [
    { name: 'Next.js', triggers: ['next'] },
    { name: 'React', triggers: ['react', 'react-dom'] },
    { name: 'Express', triggers: ['express'] },
    { name: 'Fastify', triggers: ['fastify'] },
    { name: 'NestJS', triggers: ['@nestjs/core'] },
    { name: 'Vue.js', triggers: ['vue'] },
    { name: 'Tailwind CSS', triggers: ['tailwindcss'] },
    { name: 'FastAPI', triggers: ['fastapi'] },
    { name: 'Flask', triggers: ['flask'] },
    { name: 'Django', triggers: ['django'] },
    { name: 'Prisma', triggers: ['@prisma/client', 'prisma'], db: 'Prisma ORM' },
    { name: 'SQLAlchemy', triggers: ['sqlalchemy'], db: 'SQLAlchemy ORM' },
    { name: 'Mongoose', triggers: ['mongoose'], db: 'MongoDB / Mongoose' },
    { name: 'TypeORM', triggers: ['typeorm'], db: 'TypeORM' },
    { name: 'SQLite', triggers: ['sqlite3', 'better-sqlite3'], db: 'SQLite' },
    { name: 'PostgreSQL Driver', triggers: ['pg', 'psycopg2', 'psycopg2-binary'], db: 'PostgreSQL' },
  ];

  for (const rule of FRAMEWORK_RULES) {
    const matched = rule.triggers.filter((t) => detectedDeps.has(t));
    if (matched.length > 0) {
      profile.frameworks.push({
        name: rule.name,
        confidence: 'CONFIRMED',
        evidence: `Manifest dependency matches: ${matched.join(', ')}`,
      });
      if (rule.db) {
        profile.databases.push({
          name: rule.db,
          confidence: 'CONFIRMED',
          evidence: `Database dependency detected: ${matched.join(', ')}`,
        });
      }
    }
  }

  return { profile, pathAliases, manifestsData };
}
