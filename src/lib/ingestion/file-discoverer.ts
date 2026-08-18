import fs from 'fs';
import path from 'path';
import { DiscoveredFileInfo } from '../types/project';
import { calculateFileHash } from './hasher';
import { isBinaryFile } from './binary-detector';
import { evaluateIgnoreRules } from './ignore-rules';
import { IngestionConfig } from './config';

const ENTRY_POINT_PATTERNS = [
  /^index\.(ts|js|tsx|jsx|mjs)$/i,
  /^main\.(ts|js|py|go|rs|cpp|c|java)$/i,
  /^server\.(ts|js|py)$/i,
  /^app\.(ts|js|py|tsx|jsx)$/i,
  /^manage\.py$/i,
  /^wsgi\.py$/i,
  /^asgi\.py$/i,
  /^page\.(tsx|jsx|js|ts)$/i,
  /^route\.(ts|js)$/i,
  /^src\/index\.(ts|js|tsx|jsx)$/i,
  /^src\/main\.(ts|js|py|go|rs)$/i,
  /^src\/server\.(ts|js)$/i,
  /^src\/app\.(ts|js|tsx|jsx)$/i,
];

function isPotentialEntryPoint(relPath: string): boolean {
  const normalized = relPath.replace(/\\/g, '/');
  const baseName = path.basename(normalized);
  return ENTRY_POINT_PATTERNS.some((p) => p.test(normalized) || p.test(baseName));
}

async function countTextLines(filePath: string): Promise<number> {
  try {
    const content = await fs.promises.readFile(filePath, 'utf8');
    if (content.length === 0) return 0;
    // Count newlines
    let lines = 1;
    for (let i = 0; i < content.length; i++) {
      if (content.charCodeAt(i) === 10) { // \n
        lines++;
      }
    }
    return lines;
  } catch {
    return 0;
  }
}

/**
 * Recursively scans directory and builds a normalized file inventory.
 */
export async function discoverFiles(
  baseDir: string,
  config: IngestionConfig
): Promise<DiscoveredFileInfo[]> {
  const results: DiscoveredFileInfo[] = [];

  async function scan(currentDir: string): Promise<void> {
    const entries = await fs.promises.readdir(currentDir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);
      const relPath = path.relative(baseDir, fullPath).replace(/\\/g, '/');

      if (entry.isDirectory()) {
        const ignoreDecision = evaluateIgnoreRules(relPath + '/');
        // If directory is strictly ignored (e.g. .git, node_modules), don't recurse
        if (ignoreDecision.ignored) {
          continue;
        }
        await scan(fullPath);
      } else if (entry.isFile()) {
        const stat = await fs.promises.stat(fullPath);
        const isBinary = await isBinaryFile(fullPath);
        const ignoreDecision = evaluateIgnoreRules(relPath, {
          isBinary,
          sizeBytes: stat.size,
          maxSingleFileBytes: config.maxSingleFileBytes,
        });

        const hash = await calculateFileHash(fullPath);
        const lineCount = !isBinary && !ignoreDecision.ignored ? await countTextLines(fullPath) : 0;
        const isEntry = !ignoreDecision.ignored && isPotentialEntryPoint(relPath);

        results.push({
          path: relPath,
          extension: path.extname(relPath).toLowerCase(),
          sizeBytes: stat.size,
          lineCount,
          isBinary,
          isIgnored: ignoreDecision.ignored,
          ignoreReason: ignoreDecision.reason,
          isEntry,
          hash,
        });
      }
    }
  }

  await scan(baseDir);
  return results;
}
