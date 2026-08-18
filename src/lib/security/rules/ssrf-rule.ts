import { SecurityRule, SecurityRuleContext, SecurityFindingDef } from '../types';

export const ssrfRule: SecurityRule = {
  id: 'SEC-006',
  name: 'Server-Side Request Forgery (SSRF) Audit',
  category: 'NETWORK',
  scan(context: SecurityRuleContext): SecurityFindingDef[] {
    const findings: SecurityFindingDef[] = [];
    const lines = context.file.content.split(/\r?\n/);

    const ssrfPatterns = [
      /fetch\s*\(\s*(req\.query|req\.body|request\.args|url_param)/,
      /axios\.(get|post)\s*\(\s*(req\.query|req\.body|request\.args)/,
      /requests\.(get|post)\s*\(\s*(request\.args|request\.form|target_url)/,
    ];

    lines.forEach((line, idx) => {
      if (line.trim().startsWith('//') || line.trim().startsWith('#')) return;

      for (const p of ssrfPatterns) {
        if (p.test(line)) {
          findings.push({
            type: 'SSRF',
            title: 'Potential Server-Side Request Forgery (SSRF) Indicator',
            description: 'Detected outgoing network HTTP request initiated with user-supplied URL parameter. Attackers may target internal metadata services (e.g. 169.254.169.254) or intranet resources.',
            severity: 'HIGH',
            confidence: 'LIKELY',
            filePath: context.file.path,
            fileId: context.file.id,
            startLine: idx + 1,
            endLine: idx + 1,
            evidenceSnippet: line.trim(),
            cwe: 'CWE-918',
            owaspCategory: 'A10:2021-Server-Side Request Forgery',
            remediation: {
              whyItMatters: 'SSRF allows external users to forge internal requests to private cloud metadata endpoints and local services.',
              recommendedFix: 'Validate target URLs against an explicit strict allowlist of allowed hostnames/schemes and block private IP ranges (127.0.0.1, 10.0.0.0/8, 169.254.0.0/16).',
              validationSteps: [
                'Verify URL hostname matches permitted external APIs before dispatching HTTP request.',
              ],
            },
          });
        }
      }
    });

    return findings;
  },
};
