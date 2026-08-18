import { describe, it, expect } from 'vitest';
import { TypeScriptParser } from '@/lib/intelligence/parsers/typescript-parser';

describe('TypeScriptParser: AST & Symbol Extraction', () => {
  const parser = new TypeScriptParser();

  it('should parse TypeScript functions, classes, interfaces, and methods', async () => {
    const code = `
export interface User {
  id: string;
  name: string;
}

export class UserService {
  private count: number = 0;

  constructor() {
    this.count = 1;
  }

  public async getUser(id: string): Promise<User> {
    if (id === "admin") {
      return { id: "1", name: "Admin" };
    }
    return { id, name: "Normal" };
  }
}

export function createUserService(): UserService {
  return new UserService();
}
`;

    const result = await parser.parse('file_1', 'src/user.ts', code);

    expect(result.language).toBe('TYPESCRIPT');
    expect(result.symbols.length).toBeGreaterThanOrEqual(4);

    const iface = result.symbols.find((s) => s.name === 'User');
    expect(iface).toBeDefined();
    expect(iface?.kind).toBe('INTERFACE');

    const cls = result.symbols.find((s) => s.name === 'UserService');
    expect(cls).toBeDefined();
    expect(cls?.kind).toBe('CLASS');
    expect(cls?.isExported).toBe(true);

    const method = result.symbols.find((s) => s.name === 'getUser');
    expect(method).toBeDefined();
    expect(method?.kind).toBe('METHOD');
    expect(method?.parentName).toBe('UserService');
    expect(method?.complexity).toBeGreaterThan(1); // includes if statement
  });

  it('should extract imports, exports, and function calls', async () => {
    const code = `
import { authHelper } from './auth';
import defaultLogger from 'logger';

export function runTask() {
  const isOk = authHelper();
  defaultLogger(isOk);
}
`;

    const result = await parser.parse('file_2', 'src/task.ts', code);

    expect(result.imports.length).toBe(2);
    expect(result.imports[0].rawSource).toBe('./auth');
    expect(result.imports[0].importedSymbols).toContain('authHelper');

    const call1 = result.calls.find((c) => c.calleeName === 'authHelper');
    expect(call1).toBeDefined();
    expect(call1?.callerSymbolName).toBe('runTask');
  });

  it('should extract environment variable references (process.env.VAR)', async () => {
    const code = `
const secret = process.env.API_SECRET_KEY;
const port = process.env["PORT"] || 3000;
`;
    const result = await parser.parse('file_3', 'src/config.ts', code);

    expect(result.envVars.length).toBe(2);
    expect(result.envVars.map((e) => e.name)).toContain('API_SECRET_KEY');
    expect(result.envVars.map((e) => e.name)).toContain('PORT');
  });
});
