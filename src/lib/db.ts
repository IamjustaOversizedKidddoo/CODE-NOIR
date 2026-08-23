import path from 'path';
import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

/**
 * Creates the correct PrismaClient for the current environment.
 *
 * Production / Vercel:
 *   Uses the @prisma/adapter-libsql Turso adapter.
 *   Reads TURSO_DATABASE_URL and TURSO_AUTH_TOKEN from environment.
 *   Turso is a persistent cloud SQLite database — tables survive across all
 *   Vercel serverless invocations indefinitely.
 *
 * Local development:
 *   Uses the standard file-based SQLite driver resolved to an absolute path
 *   so the Prisma CLI and the Next.js runtime open the exact same file.
 */
function createPrismaClient(): PrismaClient {
  const isTurso =
    (process.env.NODE_ENV === 'production' || !!process.env.VERCEL) &&
    !!process.env.TURSO_DATABASE_URL;

  if (isTurso) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { createClient } = require('@libsql/client') as typeof import('@libsql/client');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { PrismaLibSQL } = require('@prisma/adapter-libsql') as typeof import('@prisma/adapter-libsql');

    const turso = createClient({
      url: process.env.TURSO_DATABASE_URL!,
      authToken: process.env.TURSO_AUTH_TOKEN,
    });

    const adapter = new PrismaLibSQL(turso);
    return new PrismaClient({
      adapter,
      log: ['error'],
    } as ConstructorParameters<typeof PrismaClient>[0]);
  }

  // Local development — absolute path ensures CLI and runtime use same file.
  const dbPath = path.resolve(process.cwd(), 'prisma', 'dev.db');
  const dbUrl = `file:${dbPath}`;
  process.env.DATABASE_URL = dbUrl;

  return new PrismaClient({
    datasources: { db: { url: dbUrl } },
    log: ['error', 'warn'],
  });
}

// Cache in ALL environments to reuse the connection across calls within the
// same warm Lambda invocation.
export const prisma = globalForPrisma.prisma ?? createPrismaClient();
globalForPrisma.prisma = prisma;

/**
 * No-op in production: Turso is persistent, schema is pushed once at setup.
 * In local dev, warns if tables are missing.
 * Kept as an export so existing call-sites compile without changes.
 */
export async function ensureDatabaseSchema(): Promise<void> {
  if (process.env.NODE_ENV === 'production' || process.env.VERCEL) return;

  try {
    await prisma.$queryRaw`SELECT 1 FROM "Project" LIMIT 1`;
  } catch {
    console.warn(
      '[DB] Local dev.db has no tables — run `npm run db:push` to initialize.'
    );
  }
}

export default prisma;
