import path from 'path';
import { execSync } from 'child_process';
import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  dbInitialized: boolean | undefined;
};

function getResolvedDatabaseUrl(): string {
  if (process.env.VERCEL) {
    return 'file:/tmp/dev.db';
  }

  const rawUrl = process.env.DATABASE_URL?.trim();

  if (!rawUrl) {
    const dbPath = path.resolve(process.cwd(), 'prisma', 'dev.db');
    return `file:${dbPath}`;
  }

  if (rawUrl.startsWith('file:')) {
    const filePath = rawUrl.substring(5);
    if (!path.isAbsolute(filePath)) {
      const normalizedPath = filePath.replace(/^\.\/prisma\//, '').replace(/^\.\//, '');
      const dbPath = path.resolve(process.cwd(), 'prisma', normalizedPath);
      return `file:${dbPath}`;
    }
  }

  return rawUrl;
}

const dbUrl = getResolvedDatabaseUrl();
process.env.DATABASE_URL = dbUrl;

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasources: {
      db: {
        url: dbUrl,
      },
    },
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

let isEnsuringDb = false;

/**
 * Ensures SQLite database tables exist by running `prisma db push` automatically if needed.
 */
export async function ensureDatabaseSchema(): Promise<void> {
  if (globalForPrisma.dbInitialized || isEnsuringDb) return;
  isEnsuringDb = true;

  try {
    // Check if main table exists
    await prisma.$queryRaw`SELECT 1 FROM Project LIMIT 1`;
    globalForPrisma.dbInitialized = true;
  } catch (err: any) {
    const errStr = String(err?.message || err);
    if (
      errStr.includes('does not exist') ||
      errStr.includes('no such table') ||
      errStr.includes('P2021') ||
      errStr.includes('P1014')
    ) {
      console.log('[DB Initializer] SQLite tables missing. Auto-executing prisma db push...');
      try {
        execSync('npx prisma db push --skip-generate', {
          env: process.env,
          shell: true,
          stdio: 'pipe',
        });
        // Re-verify table exists
        await prisma.$queryRaw`SELECT 1 FROM Project LIMIT 1`;
        globalForPrisma.dbInitialized = true;
        console.log('[DB Initializer] SQLite database schema initialized successfully.');
      } catch (pushErr: any) {
        console.error('[DB Initializer] Failed to push schema automatically:', pushErr?.message || pushErr);
      }
    } else {
      // If table is simply empty, query succeeded or returned empty set
      globalForPrisma.dbInitialized = true;
    }
  } finally {
    isEnsuringDb = false;
  }
}

export default prisma;
