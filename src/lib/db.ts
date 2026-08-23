import path from 'path';
import { PrismaClient } from '@prisma/client';
import { createClient } from '@libsql/client';
import { PrismaLibSQL } from '@prisma/adapter-libsql';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

/**
 * Creates the correct PrismaClient for the current environment.
 *
 * Production / Vercel:
 *   Uses Turso (cloud SQLite via libSQL adapter).
 *   TURSO_DATABASE_URL + TURSO_AUTH_TOKEN must be set in Vercel env vars.
 *
 * Local development:
 *   Uses local SQLite file at prisma/dev.db (absolute path).
 */
function createPrismaClient(): PrismaClient {
  const isTurso =
    (process.env.NODE_ENV === 'production' || !!process.env.VERCEL) &&
    !!process.env.TURSO_DATABASE_URL;

  if (isTurso) {
    const libsql = createClient({
      url: process.env.TURSO_DATABASE_URL!,
      authToken: process.env.TURSO_AUTH_TOKEN,
    });
    const adapter = new PrismaLibSQL(libsql);
    return new PrismaClient({ adapter, log: ['error'] });
  }

  // Local development — absolute path so CLI and runtime open the same file.
  const dbPath = path.resolve(process.cwd(), 'prisma', 'dev.db');
  const dbUrl = `file:${dbPath}`;
  process.env.DATABASE_URL = dbUrl;
  return new PrismaClient({ datasources: { db: { url: dbUrl } }, log: ['error', 'warn'] });
}

// Cache in ALL environments to reuse connection across warm Lambda calls.
export const prisma = globalForPrisma.prisma ?? createPrismaClient();
globalForPrisma.prisma = prisma;

/**
 * No-op in production (Turso schema is persistent, pushed once).
 * Warns locally if dev.db tables are missing.
 */
export async function ensureDatabaseSchema(): Promise<void> {
  if (process.env.NODE_ENV === 'production' || process.env.VERCEL) return;
  try {
    await prisma.$queryRaw`SELECT 1 FROM "Project" LIMIT 1`;
  } catch {
    console.warn('[DB] Local dev.db missing tables — run `npm run db:push`.');
  }
}

export default prisma;
