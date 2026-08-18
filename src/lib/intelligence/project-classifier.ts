import { FileAnalysisResult, TechnologyProfile } from '../types/intelligence';

export function classifyProjectCharacteristics(
  files: { path: string }[],
  manifests: { path: string; content: string }[],
  analyses: FileAnalysisResult[]
): {
  projectTypes: string[];
  frameworks: { name: string; confidence: 'CONFIRMED' | 'LIKELY' | 'POSSIBLE'; evidence: string }[];
  packageManagers: { name: string; evidence: string }[];
  architectures: string[];
  externalServices: { name: string; category: string; evidence: string }[];
  isMonorepo: boolean;
  workspaces: string[];
  sizeTier: 'TINY' | 'SMALL' | 'MEDIUM' | 'LARGE' | 'VERY_LARGE';
} {
  const projectTypes = new Set<string>();
  const frameworks: { name: string; confidence: 'CONFIRMED' | 'LIKELY' | 'POSSIBLE'; evidence: string }[] = [];
  const packageManagers: { name: string; evidence: string }[] = [];
  const architectures = new Set<string>();
  const externalServices: { name: string; category: string; evidence: string }[] = [];
  const workspaces: string[] = [];

  const filePaths = files.map((f) => f.path.toLowerCase());
  const totalFiles = files.length;

  // 1. Repository Size Tier
  let sizeTier: 'TINY' | 'SMALL' | 'MEDIUM' | 'LARGE' | 'VERY_LARGE' = 'MEDIUM';
  if (totalFiles < 20) sizeTier = 'TINY';
  else if (totalFiles <= 100) sizeTier = 'SMALL';
  else if (totalFiles <= 500) sizeTier = 'MEDIUM';
  else if (totalFiles <= 2000) sizeTier = 'LARGE';
  else sizeTier = 'VERY_LARGE';

  // 2. Package Managers & Manifests
  if (filePaths.some((p) => p.includes('pnpm-workspace') || p.includes('pnpm-lock'))) {
    packageManagers.push({ name: 'pnpm', evidence: 'pnpm workspace / lockfile detected' });
  }
  if (filePaths.some((p) => p.includes('yarn.lock'))) {
    packageManagers.push({ name: 'yarn', evidence: 'yarn.lock detected' });
  }
  if (filePaths.some((p) => p.includes('cargo.toml') || p.includes('cargo.lock'))) {
    packageManagers.push({ name: 'cargo', evidence: 'Cargo workspace detected' });
  }

  manifests.forEach((m) => {
    const name = m.path.toLowerCase();
    if (name.includes('package.json')) {
      if (m.content.includes('pnpm')) packageManagers.push({ name: 'pnpm', evidence: 'package.json pnpm metadata' });
      else if (m.content.includes('yarn')) packageManagers.push({ name: 'yarn', evidence: 'package.json yarn metadata' });
      else packageManagers.push({ name: 'npm', evidence: 'package.json manifest' });
    }
    if (name.includes('pnpm-lock.yaml') || name.includes('pnpm-workspace.yaml')) {
      packageManagers.push({ name: 'pnpm', evidence: 'pnpm-lock / pnpm-workspace file' });
    }
    if (name.includes('yarn.lock')) packageManagers.push({ name: 'yarn', evidence: 'yarn.lock' });
    if (name.includes('requirements.txt')) packageManagers.push({ name: 'pip', evidence: 'requirements.txt manifest' });
    if (name.includes('pyproject.toml')) {
      if (m.content.includes('poetry')) packageManagers.push({ name: 'poetry', evidence: 'pyproject.toml poetry configuration' });
      else if (m.content.includes('uv')) packageManagers.push({ name: 'uv', evidence: 'pyproject.toml uv configuration' });
      else packageManagers.push({ name: 'pip / build', evidence: 'pyproject.toml manifest' });
    }
    if (name.includes('cargo.toml')) packageManagers.push({ name: 'cargo', evidence: 'Cargo.toml manifest' });
    if (name.includes('pom.xml')) packageManagers.push({ name: 'maven', evidence: 'pom.xml manifest' });
    if (name.includes('build.gradle') || name.includes('settings.gradle')) packageManagers.push({ name: 'gradle', evidence: 'Gradle build scripts' });
    if (name.includes('go.mod')) packageManagers.push({ name: 'go modules', evidence: 'go.mod manifest' });
  });

  // 3. Monorepo & Workspaces Detection
  const hasApps = filePaths.some((p) => p.startsWith('apps/'));
  const hasPackages = filePaths.some((p) => p.startsWith('packages/'));
  const hasServices = filePaths.some((p) => p.startsWith('services/'));
  const hasLibs = filePaths.some((p) => p.startsWith('libs/'));
  const hasTurbo = filePaths.some((p) => p.includes('turbo.json'));
  const hasPnpmWs = filePaths.some((p) => p.includes('pnpm-workspace.yaml'));
  const hasCargoWs = manifests.some((m) => m.path.toLowerCase().includes('cargo.toml') && m.content.includes('[workspace]'));

  const isMonorepo = (hasApps && (hasPackages || hasLibs)) || hasTurbo || hasPnpmWs || hasCargoWs || (hasServices && hasPackages);

  if (isMonorepo) {
    projectTypes.add('MONOREPO');
    if (hasApps) workspaces.push('apps/');
    if (hasPackages) workspaces.push('packages/');
    if (hasServices) workspaces.push('services/');
    if (hasLibs) workspaces.push('libs/');
  }

  // 4. Framework Detection (from Manifests & Source Imports)
  const manifestJoined = manifests.map((m) => m.content).join(' ');
  const allImports = analyses.flatMap((a) => a.imports.map((i) => i.rawSource.toLowerCase()));

  // Next.js
  if (manifestJoined.includes('"next"') || allImports.includes('next') || filePaths.some((p) => p.includes('next.config'))) {
    frameworks.push({ name: 'Next.js', confidence: 'CONFIRMED', evidence: 'Next.js configuration / imports detected' });
    projectTypes.add('WEB_APPLICATION');
    projectTypes.add('FRONTEND');
    architectures.add('MVC');
  }

  // React
  if (manifestJoined.includes('"react"') || allImports.includes('react')) {
    frameworks.push({ name: 'React', confidence: 'CONFIRMED', evidence: 'React import / dependency detected' });
    projectTypes.add('FRONTEND');
  }

  // FastAPI
  if (manifestJoined.includes('fastapi') || allImports.includes('fastapi')) {
    frameworks.push({ name: 'FastAPI', confidence: 'CONFIRMED', evidence: 'FastAPI dependency / routes detected' });
    projectTypes.add('API');
    projectTypes.add('BACKEND_SERVICE');
    architectures.add('SERVICE_ORIENTED');
  }

  // Express / NestJS
  if (manifestJoined.includes('"express"') || allImports.includes('express')) {
    frameworks.push({ name: 'Express', confidence: 'CONFIRMED', evidence: 'Express server routes detected' });
    projectTypes.add('BACKEND_SERVICE');
    projectTypes.add('API');
  }
  if (manifestJoined.includes('@nestjs/core') || allImports.includes('@nestjs/core')) {
    frameworks.push({ name: 'NestJS', confidence: 'CONFIRMED', evidence: 'NestJS modules detected' });
    projectTypes.add('BACKEND_SERVICE');
    architectures.add('LAYERED');
  }

  // Spring Boot
  if (manifestJoined.includes('spring-boot') || filePaths.some((p) => p.includes('application.properties') || p.includes('application.yml'))) {
    frameworks.push({ name: 'Spring Boot', confidence: 'CONFIRMED', evidence: 'Spring Boot configuration / annotations' });
    projectTypes.add('BACKEND_SERVICE');
    architectures.add('LAYERED');
  }

  // Gin / Actix / Rocket / Go / Rust frameworks
  if (manifestJoined.includes('gin-gonic') || allImports.includes('github.com/gin-gonic/gin')) {
    frameworks.push({ name: 'Gin (Go)', confidence: 'CONFIRMED', evidence: 'Gin HTTP router detected' });
    projectTypes.add('API');
    projectTypes.add('BACKEND_SERVICE');
  }
  if (manifestJoined.includes('actix-web') || allImports.includes('actix_web')) {
    frameworks.push({ name: 'Actix Web (Rust)', confidence: 'CONFIRMED', evidence: 'Actix web actor framework' });
    projectTypes.add('API');
    projectTypes.add('BACKEND_SERVICE');
  }

  // CLI Tools
  const hasCliFiles = filePaths.some((p) => p.includes('cli.') || p.includes('/cli/') || p.includes('cmd/'));
  const hasArgparse = allImports.some((i) => i.includes('argparse') || i.includes('click') || i.includes('commander') || i.includes('clap') || i.includes('cobra'));
  if (hasCliFiles || hasArgparse) {
    projectTypes.add('CLI');
    architectures.add('CLI');
  }

  // AI / ML Projects
  const isAi = allImports.some((i) =>
    ['openai', 'anthropic', '@google/genai', '@google/generative-ai', 'langchain', 'llama_index', 'torch', 'tensorflow', 'transformers'].includes(i)
  );
  if (isAi) {
    projectTypes.add('AI_ML_PROJECT');
    externalServices.push({ name: 'AI LLM API', category: 'AI_PROVIDER', evidence: 'LLM SDK imports detected' });
  }

  // Infrastructure / DevOps
  const isInfra = filePaths.some((p) => p.endsWith('.tf') || p.includes('docker-compose') || p.includes('k8s') || p.includes('.github/workflows'));
  if (isInfra) {
    projectTypes.add('INFRASTRUCTURE');
  }

  // External Services (Databases, Cloud)
  if (manifestJoined.includes('mysql') || manifestJoined.includes('pg') || manifestJoined.includes('prisma') || manifestJoined.includes('sqlalchemy')) {
    externalServices.push({ name: 'SQL Database', category: 'DATABASE', evidence: 'Database driver / ORM detected' });
    architectures.add('LAYERED');
  }
  if (manifestJoined.includes('redis') || manifestJoined.includes('ioredis')) {
    externalServices.push({ name: 'Redis Cache / Queue', category: 'CACHE_QUEUE', evidence: 'Redis client detected' });
    architectures.add('EVENT_DRIVEN');
  }

  if (projectTypes.size === 0) {
    projectTypes.add('WEB_APPLICATION');
  }

  if (architectures.size === 0) {
    architectures.add('MODULAR_MONOLITH');
  }

  return {
    projectTypes: Array.from(projectTypes),
    frameworks,
    packageManagers,
    architectures: Array.from(architectures),
    externalServices,
    isMonorepo,
    workspaces,
    sizeTier,
  };
}
