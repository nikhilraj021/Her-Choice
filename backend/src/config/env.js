import { z } from 'zod';

const isProduction = process.env.NODE_ENV === 'production';

// Comma-separated list of allowed browser origins, e.g. "https://herchoice.in,https://www.herchoice.in"
const originList = z
  .string()
  .trim()
  .min(1)
  .transform((value) => value.split(',').map((origin) => origin.trim()).filter(Boolean))
  .pipe(z.array(z.url({ protocol: /^https?$/ })).min(1));

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(5000),
  // Required in production; defaults to the Next.js dev server otherwise.
  FRONTEND_URL: isProduction ? originList : originList.default(['http://localhost:3000']),
  JSON_BODY_LIMIT: z.string().trim().min(1).default('100kb'),

  // Database settings are only read here; they are validated strictly once the database layer exists.
  DB_HOST: z.string().default('localhost'),
  DB_PORT: z.coerce.number().int().default(3306),
  DB_USER: z.string().default('root'),
  DB_PASSWORD: z.string().default(''),
  DB_NAME: z.string().default('her_choice'),
});

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  // Print variable names and rule violations only, never the values.
  const problems = parsed.error.issues
    .map((issue) => `  - ${issue.path.join('.') || '(root)'}: ${issue.message}`)
    .join('\n');
  console.error(`Invalid environment configuration:\n${problems}`);
  process.exit(1);
}

const vars = parsed.data;

export const env = Object.freeze({
  nodeEnv: vars.NODE_ENV,
  isProduction: vars.NODE_ENV === 'production',
  isTest: vars.NODE_ENV === 'test',
  port: vars.PORT,
  frontendUrls: vars.FRONTEND_URL,
  jsonBodyLimit: vars.JSON_BODY_LIMIT,
  db: Object.freeze({
    host: vars.DB_HOST,
    port: vars.DB_PORT,
    user: vars.DB_USER,
    password: vars.DB_PASSWORD,
    database: vars.DB_NAME,
  }),
});
