import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { Prisma } from '@prisma/client';
import express from 'express';
import request from 'supertest';
import { errorHandler } from '../../src/middlewares/errorHandler.js';

function appThrowing(error) {
  const app = express();
  app.get('/boom', () => {
    throw error;
  });
  app.use(errorHandler);
  return app;
}

function prismaError(code) {
  return new Prisma.PrismaClientKnownRequestError(`Prisma ${code}`, { code, clientVersion: '7.10.0' });
}

describe('errorHandler: Prisma errors', () => {
  const cases = [
    ['P2002', 409, 'CONFLICT'],
    ['P2003', 409, 'CONFLICT'],
    ['P2025', 404, 'NOT_FOUND'],
    ['P2000', 400, 'BAD_REQUEST'],
    ['P1001', 503, 'SERVICE_UNAVAILABLE'],
    ['P2024', 503, 'SERVICE_UNAVAILABLE'],
  ];

  for (const [prismaCode, status, code] of cases) {
    it(`maps ${prismaCode} to ${status} ${code}`, async () => {
      const res = await request(appThrowing(prismaError(prismaCode))).get('/boom');

      assert.equal(res.status, status);
      assert.equal(res.body.error.code, code);
      assert.doesNotMatch(res.body.error.message, /Prisma/);
    });
  }

  it('treats unmapped Prisma errors as internal errors', async () => {
    const res = await request(appThrowing(prismaError('P2010'))).get('/boom');
    assert.equal(res.status, 500);
    assert.equal(res.body.error.code, 'INTERNAL_SERVER_ERROR');
  });
});

describe('errorHandler: production', () => {
  it('never exposes internal messages or stack traces', () => {
    // Runs in a child process because the environment is validated once per process
    const backendRoot = fileURLToPath(new URL('../../', import.meta.url));
    const script = `
      import express from 'express';
      import request from 'supertest';
      const { errorHandler } = await import('./src/middlewares/errorHandler.js');
      const app = express();
      app.get('/boom', () => { throw new Error('connect ECONNREFUSED secret-db-host user=root'); });
      app.use(errorHandler);
      const res = await request(app).get('/boom');
      process.stdout.write(JSON.stringify({ status: res.status, body: res.body }));
    `;

    const output = execFileSync(process.execPath, ['--input-type=module', '-e', script], {
      cwd: backendRoot,
      env: {
        ...process.env,
        NODE_ENV: 'production',
        FRONTEND_URL: 'https://shop.example.com',
        DATABASE_URL: 'mysql://u:p@localhost:3306/shop',
        LOG_LEVEL: 'silent',
      },
      encoding: 'utf8',
    });
    const { status, body } = JSON.parse(output);

    assert.equal(status, 500);
    assert.equal(body.error.code, 'INTERNAL_SERVER_ERROR');
    assert.equal(body.error.message, 'Something went wrong');
    assert.doesNotMatch(JSON.stringify(body), /secret-db-host|ECONNREFUSED|stack|at /);
  });
});
