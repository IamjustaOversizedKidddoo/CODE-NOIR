export function isPlaceholderSecret(val: string): boolean {
  const normalized = val.trim().toLowerCase();
  const exactPlaceholders = [
    'your-api-key',
    'your_api_key',
    'your-key-here',
    'your_secret_here',
    'placeholder',
    'default_secret',
    'changeme',
    'change_me',
    'example_key',
    '123456',
    'password',
    'test_secret',
    'dummy_token',
    '<api_key>',
    'xxx',
  ];

  if (exactPlaceholders.includes(normalized)) return true;
  if (normalized.startsWith('your-') || normalized.startsWith('your_') || normalized.startsWith('<')) return true;
  return normalized.length < 6;
}

export function redactSecretString(input: string): string {
  if (!input) return '';

  let sanitized = input;

  // 1. Redact API Key Assignments (e.g. OPENAI_API_KEY = "sk-...")
  sanitized = sanitized.replace(
    /(api[_-]?key|secret|token|password|auth[_-]?key|jwt[_-]?secret)\s*[:=]\s*(['"][^'"]+['"])/gi,
    (match, keyName, value) => {
      const cleanVal = value.replace(/['"]/g, '');
      if (isPlaceholderSecret(cleanVal)) {
        return `${keyName} = "[PLACEHOLDER_SECRET]"`;
      }
      return `${keyName} = "[REDACTED]"`;
    }
  );

  // 2. Redact Private Key blocks (RSA / OpenSSH / EC)
  sanitized = sanitized.replace(
    /-----BEGIN[ A-Z0-9_-]+KEY-----[A-Za-z0-9+/=\s\r\n]+-----END[ A-Z0-9_-]+KEY-----/g,
    '-----BEGIN [REDACTED PRIVATE KEY]-----'
  );

  // 3. Redact Bearer / JWT Tokens
  sanitized = sanitized.replace(
    /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/g,
    '[REDACTED_JWT_TOKEN]'
  );

  return sanitized;
}
