import path from 'path';
import { ResolvedEntity } from '../types';

export function resolveEntitiesFromPrompt(
  prompt: string,
  projectFiles: { id: string; path: string }[],
  projectSymbols: { id: string; name: string; fileId: string; kind: string; filePath?: string }[]
): ResolvedEntity[] {
  const resolved: ResolvedEntity[] = [];
  const words = prompt
    .split(/[\s,?"'`:;()[\]{}]+/)
    .map((w) => w.trim())
    .filter((w) => w.length > 1);

  // 1. Check for File Matches
  for (const file of projectFiles) {
    const baseName = path.basename(file.path).toLowerCase();
    const cleanPath = file.path.toLowerCase();

    const isMatch = words.some((word) => {
      const wLower = word.toLowerCase();
      return (
        wLower === baseName ||
        wLower === cleanPath ||
        (baseName.includes('.') && wLower === baseName.split('.')[0])
      );
    });

    if (isMatch) {
      resolved.push({
        type: 'FILE',
        name: path.basename(file.path),
        fileId: file.id,
        filePath: file.path,
      });
    }
  }

  // 2. Check for Symbol Matches
  const symbolMatchesByName = new Map<string, { id: string; name: string; fileId: string; kind: string; filePath?: string }[]>();

  for (const sym of projectSymbols) {
    const symName = sym.name.toLowerCase();
    const isMatch = words.some((w) => w.toLowerCase() === symName);

    if (isMatch) {
      if (!symbolMatchesByName.has(sym.name)) {
        symbolMatchesByName.set(sym.name, []);
      }
      symbolMatchesByName.get(sym.name)!.push(sym);
    }
  }

  for (const [name, matches] of symbolMatchesByName.entries()) {
    if (matches.length === 1) {
      const match = matches[0];
      resolved.push({
        type: 'SYMBOL',
        name: match.name,
        symbolId: match.id,
        symbolKind: match.kind,
        fileId: match.fileId,
        filePath: match.filePath,
      });
    } else {
      // Multiple candidates found -> Disambiguation structure
      resolved.push({
        type: 'MULTIPLE_CANDIDATES',
        name,
        candidates: matches.map((m) => ({
          id: m.id,
          name: m.name,
          path: m.filePath || m.fileId,
          kind: m.kind,
        })),
      });
    }
  }

  return resolved;
}
