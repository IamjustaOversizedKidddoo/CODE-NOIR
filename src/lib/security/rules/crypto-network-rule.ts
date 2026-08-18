import { SecurityRule, SecurityRuleContext, SecurityFindingDef } from '../types';

export const cryptoNetworkRule: SecurityRule = {
  id: 'SEC-008',
  name: 'Cryptography & Transport Security Audit',
  category: 'CRYPTOGRAPHY_AND_TRANSPORT',
  scan(context: SecurityRuleContext): SecurityFindingDef[] {
    const findings: SecurityFindingDef[] = [];
    const lines = context.file.content.split(/\r?\n/);

    const patterns = [
      {
        regex: /createHash\s*\(\s*['"](md5|sha1)['"]\s*\)/i,
        type: 'CRYPTO_WEAKNESS' as const,
        title: 'Weak Hash Algorithm (MD5 / SHA1)',
        desc: 'MD5 and SHA1 are cryptographically broken and vulnerable to collision attacks.',
        severity: 'MEDIUM' as const,
        cwe: 'CWE-328',
      },
      {
        regex: /rejectUnauthorized\s*:\s*false/i,
        type: 'INSECURE_TRANSPORT' as const,
        title: 'Disabled TLS Certificate Verification (rejectUnauthorized: false)',
        desc: 'Disabling certificate validation allows Machine-in-the-Middle (MitM) interception of all traffic.',
        severity: 'HIGH' as const,
        cwe: 'CWE-295',
      },
      {
        regex: /verify\s*=\s*False\b/,
        type: 'INSECURE_TRANSPORT' as const,
        title: 'Disabled SSL Verification (verify=False)',
        desc: 'Disabling SSL validation in requests/urllib permits MitM eavesdropping on HTTPS traffic.',
        severity: 'HIGH' as const,
        cwe: 'CWE-295',
      },
    ];

    lines.forEach((line, idx) => {
      if (line.trim().startsWith('//') || line.trim().startsWith('#')) return;

      for (const p of patterns) {
        if (p.regex.test(line)) {
          findings.push({
            type: p.type,
            title: p.title,
            description: p.desc,
            severity: p.severity,
            confidence: 'CONFIRMED',
            filePath: context.file.path,
            fileId: context.file.id,
            startLine: idx + 1,
            endLine: idx + 1,
            evidenceSnippet: line.trim(),
            cwe: p.cwe,
            owaspCategory: 'A02:2021-Cryptographic Failures',
            remediation: {
              whyItMatters: 'Weak crypto and disabled TLS verification compromise confidentiality and data integrity.',
              recommendedFix: 'Use SHA-256 / SHA-3 or Argon2id/bcrypt for password hashing. Enable strict TLS certificate validation in production.',
              validationSteps: [
                'Ensure rejectUnauthorized is true.',
                'Ensure verify=True is preserved on all outgoing HTTPS requests.',
              ],
            },
          });
        }
      }
    });

    return findings;
  },
};
