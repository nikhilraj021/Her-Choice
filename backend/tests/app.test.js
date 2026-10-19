import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';

process.env.NODE_ENV = 'test';
process.env.FRONTEND_URL = 'http://localhost:3000';

const { default: app } = await import('../src/app.js');

let server;
let baseUrl;

before(async () => {
  server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(() => new Promise((resolve) => server.close(resolve)));

test('GET /api/health returns ok in the standard success shape', async () => {
  const res = await fetch(`${baseUrl}/api/health`);
  const body = await res.json();

  assert.equal(res.status, 200);
  assert.equal(res.headers.get('cache-control'), 'no-store');
  assert.equal(body.success, true);
  assert.equal(body.data.status, 'ok');
  assert.equal(typeof body.data.uptime, 'number');
  assert.ok(!Number.isNaN(Date.parse(body.data.timestamp)));
});

test('unknown routes return 404 in the standard error shape', async () => {
  const res = await fetch(`${baseUrl}/api/does-not-exist`);
  const body = await res.json();

  assert.equal(res.status, 404);
  assert.deepEqual(body, {
    success: false,
    error: { code: 'NOT_FOUND', message: 'Route not found: GET /api/does-not-exist' },
  });
});

test('malformed JSON returns 400 INVALID_JSON', async () => {
  const res = await fetch(`${baseUrl}/api/health`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '{"broken":',
  });
  const body = await res.json();

  assert.equal(res.status, 400);
  assert.equal(body.error.code, 'INVALID_JSON');
});

test('CORS allows FRONTEND_URL and ignores other origins', async () => {
  const allowed = await fetch(`${baseUrl}/api/health`, { headers: { Origin: 'http://localhost:3000' } });
  assert.equal(allowed.headers.get('access-control-allow-origin'), 'http://localhost:3000');
  assert.equal(allowed.headers.get('access-control-allow-credentials'), 'true');

  const blocked = await fetch(`${baseUrl}/api/health`, { headers: { Origin: 'https://evil.example' } });
  assert.equal(blocked.headers.get('access-control-allow-origin'), null);
});

test('security headers are set and x-powered-by is hidden', async () => {
  const res = await fetch(`${baseUrl}/api/health`);

  assert.equal(res.headers.get('x-powered-by'), null);
  assert.equal(res.headers.get('x-content-type-options'), 'nosniff');
  assert.ok(res.headers.get('content-security-policy'));
});
