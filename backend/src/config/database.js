import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger.js';
import { env } from './env.js';

const LOOPBACK_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]']);

/**
 * Translates DATABASE_URL into explicit pool options so the pool size, timeouts
 * and TLS are controlled by validated environment variables.
 */
function buildPoolConfig(databaseUrl) {
  const url = new URL(databaseUrl);

  return {
    host: url.hostname.replace(/^\[|\]$/g, ''),
    port: Number(url.port || 3306),
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    database: decodeURIComponent(url.pathname.slice(1)),
    connectionLimit: env.DB_CONNECTION_LIMIT,
    connectTimeout: env.DB_CONNECT_TIMEOUT_MS,
    acquireTimeout: env.DB_CONNECT_TIMEOUT_MS,
    ssl: env.DATABASE_SSL ? { rejectUnauthorized: true } : undefined,
    // MySQL 8's default auth plugin (caching_sha2_password) needs the server's RSA public key on
    // non-TLS connections. Fetching it is only safe over loopback, where it cannot be intercepted.
    allowPublicKeyRetrieval: !env.DATABASE_SSL && LOOPBACK_HOSTS.has(url.hostname),
  };
}

export const prisma = new PrismaClient({
  adapter: new PrismaMariaDb(buildPoolConfig(env.DATABASE_URL)),
  // Queries are never logged: their parameters can contain personal data
  log: [
    { emit: 'event', level: 'warn' },
    { emit: 'event', level: 'error' },
  ],
});

prisma.$on('warn', (event) => logger.warn({ prisma: event }, 'Prisma warning'));
prisma.$on('error', (event) => logger.error({ prisma: event }, 'Prisma error'));

/** Opens the pool and proves the credentials and database work. Called once at startup. */
export async function connectDatabase() {
  await prisma.$connect();
  await prisma.$queryRaw`SELECT 1`;
}

export async function disconnectDatabase() {
  await prisma.$disconnect();
}

/** Lightweight connectivity check for the health endpoint, bounded by a timeout. */
export async function pingDatabase(timeoutMs = 2000) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(`Database ping timed out after ${timeoutMs}ms`)), timeoutMs);
  });

  try {
    await Promise.race([prisma.$queryRaw`SELECT 1`, timeout]);
  } finally {
    clearTimeout(timer);
  }
}
