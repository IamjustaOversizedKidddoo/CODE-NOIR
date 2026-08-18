import { describe, it, expect } from 'vitest';
import { secretRule } from '@/lib/security/rules/secret-rule';
import { commandInjectionRule } from '@/lib/security/rules/command-injection-rule';
import { sqlInjectionRule } from '@/lib/security/rules/sql-injection-rule';
import { xssRule } from '@/lib/security/rules/xss-rule';
import { pathTraversalRule } from '@/lib/security/rules/path-traversal-rule';
import { ssrfRule } from '@/lib/security/rules/ssrf-rule';
import { deserializationRule } from '@/lib/security/rules/deserialization-rule';
import { cryptoNetworkRule } from '@/lib/security/rules/crypto-network-rule';
import { redactSecretString, isPlaceholderSecret } from '@/lib/security/redactor';
import { SecurityRuleContext } from '@/lib/security/types';

describe('Phase 9: Security Investigation Rules & Redaction', () => {
  const createMockContext = (content: string, path: string = 'src/test.ts'): SecurityRuleContext => ({
    projectId: 'test_project',
    file: { id: 'f1', path, language: 'typescript', content },
    symbols: [],
    dependencies: [],
  });

  it('1. should detect live hardcoded secrets and classify placeholders as INFO', () => {
    const liveSecretCode = `const apiKey = "sk-live-99998888777766665555";`;
    const placeholderCode = `const apiKey = "your-api-key-here";`;

    const liveFindings = secretRule.scan(createMockContext(liveSecretCode));
    const placeholderFindings = secretRule.scan(createMockContext(placeholderCode));

    expect(liveFindings.length).toBe(1);
    expect(liveFindings[0].severity).toBe('HIGH');
    expect(liveFindings[0].evidenceSnippet).toContain('[REDACTED]');

    expect(placeholderFindings.length).toBe(1);
    expect(placeholderFindings[0].severity).toBe('INFO');
    expect(placeholderFindings[0].evidenceSnippet).toContain('[PLACEHOLDER_SECRET]');
  });

  it('2. should detect potential command injection via child_process.exec or os.system', () => {
    const dangerousCode = `child_process.exec("rm -rf " + userInput);`;
    const safeCode = `console.log("executing command");`;

    const findings = commandInjectionRule.scan(createMockContext(dangerousCode));
    const safeFindings = commandInjectionRule.scan(createMockContext(safeCode));

    expect(findings.length).toBe(1);
    expect(findings[0].type).toBe('COMMAND_INJECTION');
    expect(safeFindings.length).toBe(0);
  });

  it('3. should flag unparameterized concatenated SQL queries', () => {
    const badSql = `const q = "SELECT * FROM Users WHERE name = '" + req.body.name + "'";`;
    const safeSql = `const q = prisma.$queryRaw\`SELECT * FROM Users WHERE name = \${name}\`;`;

    const badFindings = sqlInjectionRule.scan(createMockContext(badSql));
    expect(badFindings.length).toBe(1);
    expect(badFindings[0].type).toBe('SQL_INJECTION');
  });

  it('4. should detect XSS in dangerouslySetInnerHTML', () => {
    const xssCode = `<div dangerouslySetInnerHTML={{ __html: userMarkup }} />`;
    const findings = xssRule.scan(createMockContext(xssCode));

    expect(findings.length).toBe(1);
    expect(findings[0].type).toBe('XSS');
  });

  it('5. should detect path traversal in dynamic filesystem access', () => {
    const traversalCode = `fs.readFile(path.join('/uploads', req.query.file));`;
    const findings = pathTraversalRule.scan(createMockContext(traversalCode));

    expect(findings.length).toBe(1);
    expect(findings[0].type).toBe('PATH_TRAVERSAL');
  });

  it('6. should detect SSRF in unvalidated fetch requests', () => {
    const ssrfCode = `const res = await fetch(req.query.targetUrl);`;
    const findings = ssrfRule.scan(createMockContext(ssrfCode));

    expect(findings.length).toBe(1);
    expect(findings[0].type).toBe('SSRF');
  });

  it('7. should flag dangerous Python pickle deserialization', () => {
    const pickleCode = `data = pickle.loads(raw_user_bytes)`;
    const findings = deserializationRule.scan(createMockContext(pickleCode, 'app/main.py'));

    expect(findings.length).toBe(1);
    expect(findings[0].type).toBe('DESERIALIZATION');
    expect(findings[0].severity).toBe('CRITICAL');
  });

  it('8. should detect weak MD5 cryptography and disabled TLS validation', () => {
    const cryptoCode = `const hash = crypto.createHash('md5').update(pwd).digest('hex');`;
    const tlsCode = `const agent = new https.Agent({ rejectUnauthorized: false });`;

    const cryptoFindings = cryptoNetworkRule.scan(createMockContext(cryptoCode));
    const tlsFindings = cryptoNetworkRule.scan(createMockContext(tlsCode));

    expect(cryptoFindings.length).toBe(1);
    expect(cryptoFindings[0].type).toBe('CRYPTO_WEAKNESS');

    expect(tlsFindings.length).toBe(1);
    expect(tlsFindings[0].type).toBe('INSECURE_TRANSPORT');
  });

  it('9. should redact secret strings and JWT tokens cleanly', () => {
    const raw = `JWT_SECRET = "supersecret_password_12345";`;
    const redacted = redactSecretString(raw);

    expect(redacted).not.toContain('supersecret_password_12345');
    expect(redacted).toContain('[REDACTED]');
  });
});
