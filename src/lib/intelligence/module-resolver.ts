import path from 'path';
import { ConfidenceLevel, ResolutionStatus } from '../types/intelligence';

export interface ResolvedModule {
  targetFilePath?: string;
  externalPackage?: string;
  resolutionStatus: ResolutionStatus;
  confidence: ConfidenceLevel;
}

export function resolveImportPath(
  sourceFilePath: string,
  rawSource: string,
  allProjectFilePaths: Set<string>,
  pathAliases: Record<string, string[]> = {}
): ResolvedModule {
  const normalizedRaw = rawSource.trim();

  // 1. External packages check (does not start with . or / or path alias)
  const isRelative = normalizedRaw.startsWith('.') || normalizedRaw.startsWith('/');
  const aliasMatch = Object.keys(pathAliases).find((alias) => {
    const prefix = alias.replace(/\*$/, '');
    return normalizedRaw.startsWith(prefix);
  });

  if (!isRelative && !aliasMatch) {
    // External npm / pip package
    return {
      externalPackage: normalizedRaw.split('/')[0], // e.g. "express", "react"
      resolutionStatus: 'UNRESOLVED',
      confidence: 'CONFIRMED',
    };
  }

  const candidatePaths: string[] = [];

  // 2. Handle Path Aliases (e.g. "@/components/Button" -> "src/components/Button")
  if (aliasMatch) {
    const aliasPrefix = aliasMatch.replace(/\*$/, '');
    const targets = pathAliases[aliasMatch] || [];
    const remainder = normalizedRaw.slice(aliasPrefix.length);

    for (const targetPattern of targets) {
      const cleanTarget = targetPattern.replace(/\*$/, '').replace(/^\.\//, '');
      const potentialPath = path.normalize(path.join(cleanTarget, remainder)).replace(/\\/g, '/');
      candidatePaths.push(potentialPath);
    }
  } else {
    // 3. Handle Relative Paths (e.g. "./auth", "../utils/helpers")
    const sourceDir = path.dirname(sourceFilePath);
    const resolvedRel = path.normalize(path.join(sourceDir, normalizedRaw)).replace(/\\/g, '/');
    candidatePaths.push(resolvedRel);
  }

  // 4. Try extensions and index files
  const extensions = ['', '.ts', '.tsx', '.js', '.jsx', '.py', '/index.ts', '/index.tsx', '/index.js', '/index.jsx', '/__init__.py'];

  const matchedPaths: string[] = [];

  for (const basePath of candidatePaths) {
    for (const ext of extensions) {
      const testPath = `${basePath}${ext}`.replace(/\\/g, '/');
      if (allProjectFilePaths.has(testPath)) {
        if (!matchedPaths.includes(testPath)) {
          matchedPaths.push(testPath);
        }
      }
    }
  }

  if (matchedPaths.length === 1) {
    return {
      targetFilePath: matchedPaths[0],
      resolutionStatus: 'RESOLVED',
      confidence: 'CONFIRMED',
    };
  }

  if (matchedPaths.length > 1) {
    return {
      targetFilePath: matchedPaths[0],
      resolutionStatus: 'AMBIGUOUS',
      confidence: 'LIKELY',
    };
  }

  // If not resolved locally, mark unresolved
  return {
    externalPackage: normalizedRaw,
    resolutionStatus: 'UNRESOLVED',
    confidence: 'UNKNOWN',
  };
}
