import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';

// node --test runs each file in its own process, so this env applies only here.
process.env.NODE_ENV = 'production';
process.env.FRONTEND_URL = 'https://shop.example';

const { errorHandler } = await import('../src/middleware/errorHandler.js');
const { validate } = await import('../src/middleware/validate.js');
const { ApiError } = await import('../src/utils/ApiError.js');
const { z } = await import('zod');

const app = express();
app.use(express.json());
app.get('/boom', () => {
  throw new Error('db password is hunter2');
});
app.get('/async-boom', async () => {
  throw new Error('secret connection string');
});
app.get('/forbidden', () => {
  throw ApiError.forbidden();
});
app.post('/validated', validate(z.object({ name: z.string().min(1) }).strict()), (req, res) => {
  res.json(req.body);
});
app.use(errorHandler);

let server;
let baseUrl;

before(async () => {
  server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(() => new Promise((resolve) => server.close(resolve)));

for (const path of ['/boom', '/async-boom']) {
  test(`unexpected errors on ${path} hide message and stack in production`, async (t) => {
    t.mock.method(console, 'error', () => {}); // keep the expected server-side log out of test output
    const res = await fetch(`${baseUrl}${path}`);
    const text = await res.text();

    assert.equal(res.status, 500);
    assert.deepEqual(JSON.parse(text), {
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Internal server error' },
    });
    assert.doesNotMatch(text, /hunter2|secret|stack|at /);
  });
}

test('ApiError keeps its status, code and message', async () => {
  const res = await fetch(`${baseUrl}/forbidden`);
  const body = await res.json();

  assert.equal(res.status, 403);
  assert.equal(body.error.code, 'FORBIDDEN');
});

test('validate() rejects bad input with 422 and field details', async () => {
  const res = await fetch(`${baseUrl}/validated`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: '', role: 'ADMIN' }),
  });
  const body = await res.json();

  assert.equal(res.status, 422);
  assert.equal(body.error.code, 'VALIDATION_ERROR');
  assert.ok(body.error.details.some((d) => d.path === 'name'));
  assert.ok(body.error.details.length >= 2); // unknown key "role" is rejected too
});
