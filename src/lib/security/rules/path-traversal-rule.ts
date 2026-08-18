import { SecurityRule, SecurityRuleContext, SecurityFindingDef } from '../types';

export const pathTraversalRule: SecurityRule = {
  id: 'SEC-005',
  name: 'Path Traversal & Filesystem Boundary Audit',
  category: 'FILESYSTEM',
  scan(context: SecurityRuleContext): SecurityFindingDef[] {
    const findings: SecurityFindingDef[] = [];
    const lines = context.file.content.split(/\r?\n/);

    const pathPatterns = [
      /fs\.(readFile|readFileSync|createReadStream)\s*\(.*(req\.query|req\.params|req\.body)/,
      /open\s*\(.*(request\.args|request\.form|req\.params)/,
      /path\.join\s*\(.*(req\.query|req\.params|req\.body)/,
    ];

    lines.forEach((line, idx) => {
      if (line.trim().startsWith('//') || line.trim().startsWith('#')) return;

      for (const p of pathPatterns) {
        if (p.test(line)) {
          findings.push({
            type: 'PATH_TRAVERSAL',
            title: 'Potential Path Traversal Indicator',
            description: 'Detected dynamic filesystem read using unvalidated request parameters. Attackers may supply "../" dot-dot-slash sequences to escape intended folders.',
            severity: 'HIGH',
            confidence: 'LIKELY',
            filePath: context.file.path,
            fileId: context.file.id,
            startLine: idx + 1,
            endLine: idx + 1,
            evidenceSnippet: line.trim(),
            cwe: 'CWE-22',
            owaspCategory: 'A01:2021-Broken Access Control',
            remediation: {
              whyItMatters: 'Path traversal allows attackers to read arbitrary system configuration and secret files from the host.',
              recommendedFix: 'Sanitize relative filenames using path.basename(), and assert that resolved path starts with base directory: resolved.startsWith(baseDir).',
              validationSteps: [
                'Ensure paths containing "../" or leading slashes are rejected before disk read.',
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
