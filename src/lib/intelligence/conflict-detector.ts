import { FileAnalysisResult, TechnologyProfile } from '../types/intelligence';

export interface EvidenceConflict {
  id: string;
  type: string;
  docClaim: string;
  codeReality: string;
  docFile: string;
  codeFile: string;
  confidence: 'CONFIRMED' | 'LIKELY';
}

export function detectEvidenceConflicts(
  docFiles: { path: string; content: string }[],
  techProfile: TechnologyProfile,
  analyses: FileAnalysisResult[]
): EvidenceConflict[] {
  const conflicts: EvidenceConflict[] = [];

  for (const doc of docFiles) {
    const docLower = doc.content.toLowerCase();

    // 1. Database Claims vs Reality
    if (docLower.includes('postgresql') || docLower.includes('postgres')) {
      const codeUsesSqlite =
        analyses.some(
          (a) =>
            a.imports.some((i) => i.rawSource.toLowerCase().includes('sqlite')) ||
            a.envVars.some((e) => e.evidence.toLowerCase().includes('sqlite')) ||
            a.dbEvidence.some((d) => d.evidence.toLowerCase().includes('sqlite'))
        ) || techProfile.databases.some((d) => d.name.toLowerCase().includes('sqlite'));

      if (codeUsesSqlite) {
        conflicts.push({
          id: `CONF-DB-${doc.path}`,
          type: 'DATABASE_SPECIFICATION_CONFLICT',
          docClaim: 'Documentation specifies PostgreSQL database architecture.',
          codeReality: 'Static code analysis indicates SQLite database configuration.',
          docFile: doc.path,
          codeFile: 'Database configuration files',
          confidence: 'CONFIRMED',
        });
      }
    }

    // 2. Authentication Claims vs Reality
    if (docLower.includes('jwt') || docLower.includes('json web token')) {
      const hasJwtImport = analyses.some((a) =>
        a.imports.some((i) => i.rawSource.toLowerCase().includes('jsonwebtoken') || i.rawSource.toLowerCase().includes('jwt'))
      );
      const hasSessionAuth = analyses.some((a) =>
        a.imports.some((i) => i.rawSource.toLowerCase().includes('cookie-session') || i.rawSource.toLowerCase().includes('express-session'))
      );

      if (!hasJwtImport && hasSessionAuth) {
        conflicts.push({
          id: `CONF-AUTH-${doc.path}`,
          type: 'AUTHENTICATION_STRATEGY_CONFLICT',
          docClaim: 'Documentation states authentication is managed via stateless JWT tokens.',
          codeReality: 'Static analysis found cookie-session middleware and 0 JWT token libraries.',
          docFile: doc.path,
          codeFile: 'Authentication middleware',
          confidence: 'LIKELY',
        });
      }
    }
  }

  return conflicts;
}
