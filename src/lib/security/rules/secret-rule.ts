import { SecurityRule, SecurityRuleContext, SecurityFindingDef } from '../types';
import { isPlaceholderSecret, redactSecretString } from '../redactor';

export const secretRule: SecurityRule = {
  id: 'SEC-001',
  name: 'Hardcoded Secret & Credential Detection',
  category: 'SECRETS',
  scan(context: SecurityRuleContext): SecurityFindingDef[] {
    const findings: SecurityFindingDef[] = [];
    const lines = context.file.content.split(/\r?\n/);

    const secretRegex = /(api[_-]?key|secret|token|password|auth[_-]?key|jwt_secret)\s*[:=]\s*(['"][^'"]{8,}['"])/gi;

    lines.forEach((line, idx) => {
      // Ignore comment descriptions of attack or docs
      if (line.trim().startsWith('//') && line.includes('example')) return;

      let match: RegExpExecArray | null;
      while ((match = secretRegex.exec(line)) !== null) {
        const keyName = match[1];
        const rawVal = match[2].replace(/['"]/g, '');

        const isPlaceholder = isPlaceholderSecret(rawVal);
        const severity = isPlaceholder ? 'INFO' : 'HIGH';
        const confidence = isPlaceholder ? 'POSSIBLE' : 'CONFIRMED';

        findings.push({
          type: 'SECRET_LEAK',
          title: isPlaceholder
            ? `Static Secret Placeholder: ${keyName}`
            : `Potential Hardcoded Secret: ${keyName}`,
          description: isPlaceholder
            ? `Detected static placeholder assignment for ${keyName}. Ensure live secrets are populated exclusively via environment variables.`
            : `Detected hardcoded secret assignment for ${keyName} directly in source code.`,
          severity,
          confidence,
          filePath: context.file.path,
          fileId: context.file.id,
          startLine: idx + 1,
          endLine: idx + 1,
          evidenceSnippet: redactSecretString(line.trim()),
          cwe: 'CWE-798',
          owaspCategory: 'A07:2021-Identification and Authentication Failures',
          remediation: {
            whyItMatters: 'Hardcoded credentials committed to source repositories risk unauthorized credential extraction and lateral movement.',
            recommendedFix: `Extract ${keyName} into an environment variable (e.g. process.env.${keyName.toUpperCase()} or os.getenv("${keyName.toUpperCase()}")) and store in a secure secret manager.`,
            validationSteps: [
              'Verify the secret is not checked into version control (.gitignore .env).',
              'Rotate any credentials previously committed in plaintext.',
            ],
          },
        });
      }
    });

    return findings;
  },
};
