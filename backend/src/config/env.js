import { existsSync } from 'node:fs';
import { z } from 'zod';

// Tests must be deterministic, so a developer's local .env is only loaded outside the test runner.
// Variables already present in the real environment take precedence over the file.
if (process.env.NODE_ENV !== 'test' && existsSync('.env')) {
  process.loadEnvFile('.env');
}

const LOOPBACK_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]']);

const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    PORT: z.coerce.number().int().min(1).max(65535).default(5000),

    // Origin of the Next.js site. It is the only browser origin allowed to call the API with cookies,
    // and is also used to build links in emails.
    FRONTEND_URL: z
      .url({ protocol: /^https?$/, error: 'FRONTEND_URL must be an http(s) URL' })
      .transform((value) => new URL(value).origin),

    DATABASE_URL: z
      .string({ error: 'DATABASE_URL is required' })
      .refine((value) => value.startsWith('mysql://'), 'DATABASE_URL must start with mysql://')
      .refine((value) => URL.canParse(value), 'DATABASE_URL is not a valid URL')
      .refine((value) => URL.canParse(value) && new URL(value).pathname.length > 1, 'DATABASE_URL must include a database name'),
    DATABASE_SSL: z.stringbool().default(false),
    DB_CONNECTION_LIMIT: z.coerce.number().int().min(1).max(100).default(10),
    DB_CONNECT_TIMEOUT_MS: z.coerce.number().int().min(1000).max(60000).default(10000),

    TRUST_PROXY: z.coerce.number().int().min(0).max(10).default(0),
    LOG_LEVEL: z
      .enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'])
      .default('info'),
    BODY_SIZE_LIMIT: z
      .string()
      .regex(/^\d+(b|kb|mb)$/i, 'Use a size like 100kb or 1mb')
      .default('100kb'),
    RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(15 * 60 * 1000),
    RATE_LIMIT_MAX: z.coerce.number().int().positive().default(300),
  })
  .superRefine((value, ctx) => {
    if (value.NODE_ENV !== 'production') return;

    const frontend = new URL(value.FRONTEND_URL);
    if (frontend.protocol !== 'https:' && !LOOPBACK_HOSTS.has(frontend.hostname)) {
      ctx.addIssue({
        code: 'custom',
        path: ['FRONTEND_URL'],
        message: 'FRONTEND_URL must use https in production (secure cookies require it)',
      });
    }

    const database = new URL(value.DATABASE_URL);
    if (!value.DATABASE_SSL && !LOOPBACK_HOSTS.has(database.hostname)) {
      ctx.addIssue({
        code: 'custom',
        path: ['DATABASE_SSL'],
        message: 'DATABASE_SSL must be true in production when the database is not on this machine',
      });
    }
  });

/**
 * Validates a set of environment variables. Exported separately so tests can
 * check validation rules without depending on the real process environment.
 */
export function parseEnv(source) {
  const parsed = envSchema.safeParse(source);

  if (!parsed.success) {
    throw new Error(`Invalid environment configuration:\n${z.prettifyError(parsed.error)}`);
  }

  return Object.freeze({
    ...parsed.data,
    isProduction: parsed.data.NODE_ENV === 'production',
    isTest: parsed.data.NODE_ENV === 'test',
  });
}

export const env = parseEnv(process.env);
