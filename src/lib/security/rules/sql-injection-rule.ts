import { SecurityRule, SecurityRuleContext, SecurityFindingDef } from '../types';

export const sqlInjectionRule: SecurityRule = {
  id: 'SEC-003',
  name: 'Unparameterized SQL Query Construction Audit',
  category: 'INJECTION',
  scan(context: SecurityRuleContext): SecurityFindingDef[] {
    const findings: SecurityFindingDef[] = [];
    const lines = context.file.content.split(/\r?\n/);

    const rawSqlConcatPatterns = [
      /\b(SELECT|INSERT|UPDATE|DELETE|DROP|ALTER)\b.*['"]\s*\+\s*[a-zA-Z0-9_]+/i,
      /\b(SELECT|INSERT|UPDATE|DELETE|DROP|ALTER)\b.*\$\{[a-zA-Z0-9_.]+\}/i,
      /\$queryRawUnsafe\s*\(/,
      /cursor\.execute\s*\(\s*f['"].*(SELECT|INSERT|UPDATE|DELETE)/i,
      /cursor\.execute\s*\(\s*['"].*%s.*['"]\s*%/i,
    ];

    lines.forEach((line, idx) => {
      if (line.trim().startsWith('//') || line.trim().startsWith('#')) return;

      for (const pattern of rawSqlConcatPatterns) {
        if (pattern.test(line)) {
          findings.push({
            type: 'SQL_INJECTION',
            title: 'Potential SQL Injection Indicator',
            description: 'Detected dynamic SQL string concatenation or template interpolation. If input contains quotes or control characters, queries may be manipulated.',
            severity: 'HIGH',
            confidence: 'LIKELY',
            filePath: context.file.path,
            fileId: context.file.id,
            startLine: idx + 1,
            endLine: idx + 1,
            evidenceSnippet: line.trim(),
            cwe: 'CWE-89',
            owaspCategory: 'A03:2021-Injection',
            remediation: {
              whyItMatters: 'Unparameterized SQL execution permits data exfiltration, authentication bypass, and arbitrary database mutations.',
              recommendedFix: 'Use parameterized queries, ORM prepared statements ($queryRaw with tagged templates), or parameterized bind variables (e.g. cursor.execute("SELECT * WHERE id = %s", (id,))).',
              validationSteps: [
                'Ensure all SQL queries use parameterized bind placeholders (?) or ORM query builders.',
                'Never concatenate user input directly into SQL strings.',
              ],
            },
          });
          break;
        }
      }
    });

    return findings;
  },
};
