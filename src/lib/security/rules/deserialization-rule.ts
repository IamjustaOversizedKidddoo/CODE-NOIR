import { SecurityRule, SecurityRuleContext, SecurityFindingDef } from '../types';

export const deserializationRule: SecurityRule = {
  id: 'SEC-007',
  name: 'Unsafe Deserialization & Object Hydration Audit',
  category: 'DESERIALIZATION',
  scan(context: SecurityRuleContext): SecurityFindingDef[] {
    const findings: SecurityFindingDef[] = [];
    const lines = context.file.content.split(/\r?\n/);

    const deserialPatterns = [
      { regex: /\bpickle\.loads\s*\(/, name: 'pickle.loads()' },
      { regex: /\byaml\.load\s*\([^,)]+\)/, name: 'yaml.load() without SafeLoader' },
      { regex: /\bnode-serialize\b/, name: 'node-serialize' },
    ];

    lines.forEach((line, idx) => {
      if (line.trim().startsWith('//') || line.trim().startsWith('#')) return;

      for (const p of deserialPatterns) {
        if (p.regex.test(line)) {
          findings.push({
            type: 'DESERIALIZATION',
            title: `Potential Insecure Deserialization Indicator: ${p.name}`,
            description: `Detected usage of ${p.name}. Deserializing untrusted byte streams enables arbitrary code execution via constructor side-effects or pickle bytecode.`,
            severity: 'CRITICAL',
            confidence: 'CONFIRMED',
            filePath: context.file.path,
            fileId: context.file.id,
            startLine: idx + 1,
            endLine: idx + 1,
            evidenceSnippet: line.trim(),
            cwe: 'CWE-502',
            owaspCategory: 'A08:2021-Software and Data Integrity Failures',
            remediation: {
              whyItMatters: 'Unsafe deserialization allows remote attackers to execute arbitrary code simply by sending a serialized payload.',
              recommendedFix: 'Use safe serialization formats like JSON (json.loads / JSON.parse) or yaml.safe_load(). Avoid Python pickle for untrusted network input.',
              validationSteps: [
                'Ensure yaml.safe_load() is used instead of raw yaml.load().',
                'Verify that binary pickle payloads are never accepted from external HTTP clients.',
              ],
            },
          });
        }
      }
    });

    return findings;
  },
};
