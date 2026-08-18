import { SecurityRule, SecurityRuleContext, SecurityFindingDef } from '../types';

export const xssRule: SecurityRule = {
  id: 'SEC-004',
  name: 'Cross-Site Scripting (XSS) & Unsafe DOM Rendering Audit',
  category: 'CLIENT_SECURITY',
  scan(context: SecurityRuleContext): SecurityFindingDef[] {
    const findings: SecurityFindingDef[] = [];
    const lines = context.file.content.split(/\r?\n/);

    const xssPatterns = [
      { regex: /dangerouslySetInnerHTML\s*=\s*\{\s*\{\s*__html\s*:/, name: 'dangerouslySetInnerHTML' },
      { regex: /\.innerHTML\s*=/, name: 'innerHTML assignment' },
      { regex: /document\.write\s*\(/, name: 'document.write' },
    ];

    lines.forEach((line, idx) => {
      if (line.trim().startsWith('//') || line.trim().startsWith('/*')) return;

      for (const p of xssPatterns) {
        if (p.regex.test(line)) {
          findings.push({
            type: 'XSS',
            title: `Potential XSS Indicator: ${p.name}`,
            description: `Detected unescaped DOM insertion via ${p.name}. If unsanitized user markup is rendered, client-side script injection may occur.`,
            severity: 'MEDIUM',
            confidence: 'LIKELY',
            filePath: context.file.path,
            fileId: context.file.id,
            startLine: idx + 1,
            endLine: idx + 1,
            evidenceSnippet: line.trim(),
            cwe: 'CWE-79',
            owaspCategory: 'A03:2021-Injection',
            remediation: {
              whyItMatters: 'XSS enables session hijacking, unauthorized client-side actions, and credential theft.',
              recommendedFix: 'Rely on standard React JSX escaping or sanitize HTML using a DOMPurify filter before passing to __html.',
              validationSteps: [
                'Verify that inputs passed into dangerouslySetInnerHTML are sanitized via DOMPurify.',
              ],
            },
          });
        }
      }
    });

    return findings;
  },
};
