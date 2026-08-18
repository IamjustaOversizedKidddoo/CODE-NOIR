import crypto from 'crypto';
import { FileAnalysisResult } from '../types/intelligence';
import { SecurityFindingDef } from '../security/types';

export const PARSER_VERSION = 'v12.1.0';
export const ANALYZER_VERSION = 'v12.1.0';
export const SECURITY_RULES_VERSION = 'v12.1.0';

export interface CacheStats {
  hits: number;
  misses: number;
  size: number;
  hitRatio: number;
}

export class AnalysisCache {
  private static instance: AnalysisCache;
  private parseCache = new Map<string, FileAnalysisResult>();
  private securityCache = new Map<string, SecurityFindingDef[]>();
  private stats: CacheStats = { hits: 0, misses: 0, size: 0, hitRatio: 0 };

  private constructor() {}

  public static getInstance(): AnalysisCache {
    if (!AnalysisCache.instance) {
      AnalysisCache.instance = new AnalysisCache();
    }
    return AnalysisCache.instance;
  }

  public generateKey(fileHash: string, component: string, version: string): string {
    return crypto
      .createHash('sha256')
      .update(`${fileHash}:${component}:${version}`)
      .digest('hex');
  }

  // --- Parse Result Caching ---
  public getAnalysis(fileHash: string): FileAnalysisResult | null {
    const key = this.generateKey(fileHash, 'PARSE', PARSER_VERSION);
    const item = this.parseCache.get(key);
    if (item) {
      this.stats.hits++;
      this.updateHitRatio();
      return item;
    }
    this.stats.misses++;
    this.updateHitRatio();
    return null;
  }

  public setAnalysis(fileHash: string, result: FileAnalysisResult): void {
    const key = this.generateKey(fileHash, 'PARSE', PARSER_VERSION);
    this.parseCache.set(key, result);
    this.stats.size = this.parseCache.size + this.securityCache.size;
  }

  // --- Security Findings Caching ---
  public getSecurityFindings(fileHash: string): SecurityFindingDef[] | null {
    const key = this.generateKey(fileHash, 'SECURITY', SECURITY_RULES_VERSION);
    const item = this.securityCache.get(key);
    if (item) {
      this.stats.hits++;
      this.updateHitRatio();
      return item;
    }
    this.stats.misses++;
    this.updateHitRatio();
    return null;
  }

  public setSecurityFindings(fileHash: string, findings: SecurityFindingDef[]): void {
    const key = this.generateKey(fileHash, 'SECURITY', SECURITY_RULES_VERSION);
    this.securityCache.set(key, findings);
    this.stats.size = this.parseCache.size + this.securityCache.size;
  }

  // --- Invalidation & Reset ---
  public invalidateByHash(fileHash: string): void {
    const parseKey = this.generateKey(fileHash, 'PARSE', PARSER_VERSION);
    const secKey = this.generateKey(fileHash, 'SECURITY', SECURITY_RULES_VERSION);
    this.parseCache.delete(parseKey);
    this.securityCache.delete(secKey);
    this.stats.size = this.parseCache.size + this.securityCache.size;
  }

  public clear(): void {
    this.parseCache.clear();
    this.securityCache.clear();
    this.stats = { hits: 0, misses: 0, size: 0, hitRatio: 0 };
  }

  public getStats(): CacheStats {
    return { ...this.stats };
  }

  private updateHitRatio(): void {
    const total = this.stats.hits + this.stats.misses;
    this.stats.hitRatio = total > 0 ? Math.round((this.stats.hits / total) * 100) / 100 : 0;
  }
}

export function computeFileDiff(
  oldFiles: { path: string; hash: string }[],
  newFiles: { path: string; hash: string }[]
): {
  added: { path: string; hash: string }[];
  modified: { path: string; hash: string }[];
  deleted: { path: string; hash: string }[];
  unchanged: { path: string; hash: string }[];
} {
  const oldMap = new Map(oldFiles.map((f) => [f.path, f.hash]));
  const newMap = new Map(newFiles.map((f) => [f.path, f.hash]));

  const added: { path: string; hash: string }[] = [];
  const modified: { path: string; hash: string }[] = [];
  const unchanged: { path: string; hash: string }[] = [];
  const deleted: { path: string; hash: string }[] = [];

  for (const [p, h] of newMap.entries()) {
    if (!oldMap.has(p)) {
      added.push({ path: p, hash: h });
    } else if (oldMap.get(p) !== h) {
      modified.push({ path: p, hash: h });
    } else {
      unchanged.push({ path: p, hash: h });
    }
  }

  for (const [p, h] of oldMap.entries()) {
    if (!newMap.has(p)) {
      deleted.push({ path: p, hash: h });
    }
  }

  return { added, modified, deleted, unchanged };
}
