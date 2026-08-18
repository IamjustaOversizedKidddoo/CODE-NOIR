import AdmZip from 'adm-zip';

export function createTruthLabBenchmarkFixture(): Buffer {
  const zip = new AdmZip();

  zip.addFile(
    'package.json',
    Buffer.from(
      JSON.stringify({
        name: 'truth-lab-benchmark',
        version: '1.0.0',
        dependencies: {
          express: '^4.18.2',
          jsonwebtoken: '^9.0.0',
          bcrypt: '^5.1.0',
          mysql2: '^3.0.0',
        },
      })
    )
  );

  // 1. Main Entry Point
  zip.addFile(
    'src/index.ts',
    Buffer.from(`
import express from 'express';
import { setupRoutes } from './api/routes';
import { createAuthService } from './auth/service';

const app = express();
const authService = createAuthService();

setupRoutes(app);

export function startServer(): void {
  app.listen(3000, () => {
    console.log("Truth Lab Server running on port 3000");
  });
}
`)
  );

  // 2. Authentication Service (Calls password helper)
  zip.addFile(
    'src/auth/service.ts',
    Buffer.from(`
import { verifyPassword } from './password';

export class AuthService {
  private jwtSecret = "supersecret_truth_lab_production_credential_999";

  public async authenticate(username: string, pass: string): Promise<boolean> {
    if (!username || !pass) return false;
    return verifyPassword(pass, "$2b$10$hashedpw");
  }
}

export function createAuthService(): AuthService {
  return new AuthService();
}
`)
  );

  // 3. Password Helper (Does not call database directly)
  zip.addFile(
    'src/auth/password.ts',
    Buffer.from(`
export function verifyPassword(plain: string, hash: string): boolean {
  if (!plain || !hash) return false;
  return plain === "correct_password";
}
`)
  );

  // 4. API Routes
  zip.addFile(
    'src/api/routes.ts',
    Buffer.from(`
import { getUsersHandler, searchUsersHandler } from './users';

export function setupRoutes(app: any): void {
  app.get('/api/users', getUsersHandler);
  app.post('/api/users/search', searchUsersHandler);
}
`)
  );

  // 5. Users Controller (Calls DB)
  zip.addFile(
    'src/api/users.ts',
    Buffer.from(`
import { safeGetUsers, unsafeSearchUsers } from '../db/client';

export async function getUsersHandler(req: any, res: any) {
  const users = await safeGetUsers(req.query.role);
  res.json(users);
}

export async function searchUsersHandler(req: any, res: any) {
  const users = await unsafeSearchUsers(req.body.name);
  res.json(users);
}
`)
  );

  // 6. Database Client (Contains 1 Safe parameterized method & 1 Unsafe SQL injection sink)
  zip.addFile(
    'src/db/client.ts',
    Buffer.from(`
export async function safeGetUsers(role: string): Promise<any[]> {
  // Safe parameterized placeholder pattern
  const sql = "SELECT * FROM users WHERE role = ?";
  return [{ id: 1, role }];
}

export async function unsafeSearchUsers(name: string): Promise<any[]> {
  // Intentionally unsafe string concatenated query (MUST DETECT)
  const sql = "SELECT * FROM users WHERE name = '" + name + "'";
  return [{ id: 2, name }];
}
`)
  );

  // 7. Process Execution (Contains 1 Safe array & 1 Unsafe dynamic shell sink)
  zip.addFile(
    'src/utils/exec.ts',
    Buffer.from(`
import child_process from 'child_process';

export function safeExec() {
  // Safe fixed arguments
  console.log("Safe process execution");
}

export function unsafeExec(userCmd: string) {
  // Intentionally unsafe shell command injection sink (MUST DETECT)
  child_process.exec("sh -c " + userCmd);
}
`)
  );

  // 8. Ambiguous Duplicate Symbols (For testing ambiguity selector without guessing)
  zip.addFile(
    'src/auth/login.ts',
    Buffer.from(`
export function loginHandler() {
  return "Standard User Login";
}
`)
  );

  zip.addFile(
    'src/admin/login.ts',
    Buffer.from(`
export function loginHandler() {
  return "Admin Portal Login";
}
`)
  );

  // 9. Cyclic Imports (A -> B -> A)
  zip.addFile(
    'src/cyclic/a.ts',
    Buffer.from(`
import { bFunc } from './b';
export function aFunc() { return bFunc(); }
`)
  );

  zip.addFile(
    'src/cyclic/b.ts',
    Buffer.from(`
import { aFunc } from './a';
export function bFunc() { return aFunc(); }
`)
  );

  // 10. Dead / Unused Module
  zip.addFile(
    'src/utils/unused.ts',
    Buffer.from(`
export function deadCodeHelper() {
  return 42;
}
`)
  );

  return zip.toBuffer();
}
