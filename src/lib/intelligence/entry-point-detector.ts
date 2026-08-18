import path from 'path';
import { DetectedEntryPoint, FileAnalysisResult } from '../types/intelligence';

export function detectEntryPoints(
  files: { path: string; isIgnored: boolean }[],
  analyses: FileAnalysisResult[],
  packageJsonMain?: string,
  packageJsonScripts?: Record<string, string>
): DetectedEntryPoint[] {
  const entryPoints: DetectedEntryPoint[] = [];

  // 1. Check package.json "main" and scripts (e.g. "dev", "start")
  if (packageJsonMain) {
    const cleanMain = packageJsonMain.replace(/^\.\//, '');
    const matched = files.find((f) => f.path === cleanMain || f.path === `${cleanMain}.ts` || f.path === `${cleanMain}.js`);
    if (matched && !matched.isIgnored) {
      entryPoints.push({
        path: matched.path,
        reason: `Specified as "main" entry in package.json ("${packageJsonMain}")`,
        confidence: 'CONFIRMED',
      });
    }
  }

  // 2. Scan file paths and analysis results
  for (const analysis of analyses) {
    const normalized = analysis.path.replace(/\\/g, '/');
    const baseName = path.basename(normalized).toLowerCase();

    // Next.js App Router root pages and layouts
    if (normalized === 'src/app/page.tsx' || normalized === 'app/page.tsx' || normalized === 'src/app/page.jsx') {
      entryPoints.push({
        path: analysis.path,
        reason: 'Next.js App Router root page component',
        framework: 'Next.js',
        confidence: 'CONFIRMED',
      });
      continue;
    }

    if (normalized === 'src/app/layout.tsx' || normalized === 'app/layout.tsx') {
      entryPoints.push({
        path: analysis.path,
        reason: 'Next.js App Router root layout shell',
        framework: 'Next.js',
        confidence: 'CONFIRMED',
      });
      continue;
    }

    // Next.js Route handlers
    if (analysis.endpoints.some((e) => e.framework.includes('Next.js'))) {
      entryPoints.push({
        path: analysis.path,
        reason: 'Next.js HTTP API Route handler',
        framework: 'Next.js',
        confidence: 'CONFIRMED',
      });
      continue;
    }

    // Express server initialization
    if (analysis.endpoints.some((e) => e.framework === 'Express')) {
      entryPoints.push({
        path: analysis.path,
        reason: 'Express server routing and HTTP listener initialization',
        framework: 'Express',
        confidence: 'CONFIRMED',
      });
      continue;
    }

    // Standard JavaScript / TypeScript server / index entry points
    if (
      baseName === 'server.ts' ||
      baseName === 'server.js' ||
      baseName === 'index.ts' ||
      baseName === 'index.js' ||
      baseName === 'main.ts' ||
      baseName === 'main.js' ||
      baseName === 'app.ts' ||
      baseName === 'app.js'
    ) {
      // If not already added
      if (!entryPoints.some((ep) => ep.path === analysis.path)) {
        entryPoints.push({
          path: analysis.path,
          reason: `Standard application boot file (${baseName})`,
          confidence: baseName.startsWith('server') || baseName.startsWith('main') ? 'CONFIRMED' : 'LIKELY',
        });
      }
      continue;
    }

    // Python entry points: __main__.py or main.py or if __name__ == '__main__':
    if (baseName === '__main__.py') {
      entryPoints.push({
        path: analysis.path,
        reason: 'Python package executable module (__main__.py)',
        confidence: 'CONFIRMED',
      });
      continue;
    }

    if (baseName === 'main.py' || baseName === 'app.py' || baseName === 'manage.py' || baseName === 'wsgi.py') {
      entryPoints.push({
        path: analysis.path,
        reason: `Standard Python application entry script (${baseName})`,
        confidence: 'CONFIRMED',
      });
      continue;
    }
  }

  return entryPoints;
}
