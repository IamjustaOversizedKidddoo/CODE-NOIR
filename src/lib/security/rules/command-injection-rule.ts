import { SecurityRule, SecurityRuleContext, SecurityFindingDef } from '../types';

export const commandInjectionRule: SecurityRule = {
  id: 'SEC-002',
  name: 'Dynamic Process & Command Execution Audit',
  category: 'COMMAND_EXECUTION',
  scan(context: SecurityRuleContext): SecurityFindingDef[] {
    const findings: SecurityFindingDef[] = [];
    const lines = context.file.content.split(/\r?\n/);

    const patterns = [
      { regex: /\bos\.system\s*\(/, lang: 'python', name: 'os.system' },
      { regex: /\bsubprocess\.(Popen|run|call)\s*\(.*shell\s*=\s*True/i, lang: 'python', name: 'subprocess(shell=True)' },
      { regex: /\bchild_process\.(exec|execSync)\s*\(/, lang: 'javascript', name: 'child_process.exec' },
      { regex: /\beval\s*\(/, lang: 'all', name: 'eval()' },
      { regex: /\bnew\s+Function\s*\(/, lang: 'javascript', name: 'new Function()' },
    ];

    lines.forEach((line, idx) => {
      if (line.trim().startsWith('//') || line.trim().startsWith('#')) return;

      for (const p of patterns) {
        if (p.regex.test(line)) {
          findings.push({
            type: 'COMMAND_INJECTION',
            title: `Potential Command Execution Indicator: ${p.name}`,
            description: `Detected invocation of ${p.name}. If user-controlled input reaches this call without strict escaping, command injection is possible.`,
            severity: 'HIGH',
            confidence: 'LIKELY',
            filePath: context.file.path,
            fileId: context.file.id,
            startLine: idx + 1,
            endLine: idx + 1,
            evidenceSnippet: line.trim(),
            cwe: 'CWE-78',
            owaspCategory: 'A03:2021-Injection',
            remediation: {
              whyItMatters: 'Arbitrary command execution allows untrusted users to execute shell commands with host process privileges.',
              recommendedFix: 'Use parameterized subprocess arrays without shell interpretation (e.g. execFile or subprocess.run([cmd, arg1, arg2], shell=False)). Avoid eval().',
              validationSteps: [
                'Verify user inputs are never concatenated directly into shell command strings.',
                'Ensure shell=True is omitted and arguments are passed as fixed array elements.',
              ],
            },
          });
        }
      }
    });

    return findings;
  },
};
