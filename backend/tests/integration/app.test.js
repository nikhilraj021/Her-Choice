import assert from 'node:assert/strict';
import { after, before, describe, it, mock } from 'node:test';
import request from 'supertest';
import { createApp } from '../../src/app.js';
import { healthService } from '../../src/services/health.service.js';

const app = createApp();

// These tests exercise cross-cutting middleware via the health route, so its database check is stubbed
before(() => {
  mock.method(healthService, 'checkDatabase', async () => ({ status: 'up', latencyMs: 1 }));
});
after(() => mock.restoreAll());

describe('request IDs', () => {
  it('assigns a request ID', async () => {
    const res = await request(app).get('/api/v1/health');
    assert.match(res.headers['x-request-id'], /^[0-9a-f-]{36}$/);
  });

  it('propagates a safe upstream request ID', async () => {
    const res = await request(app).get('/api/v1/health').set('X-Request-Id', 'trace-abc-12345');
    assert.equal(res.headers['x-request-id'], 'trace-abc-12345');
  });

  it('replaces an unsafe upstream request ID', async () => {
    const res = await request(app).get('/api/v1/health').set('X-Request-Id', 'bad id <script>');
    assert.notEqual(res.headers['x-request-id'], 'bad id <script>');
  });
});

describe('error handling', () => {
  it('returns 404 with the error envelope for unknown routes', async () => {
    const res = await request(app).get('/api/v1/does-not-exist');

    assert.equal(res.status, 404);
    assert.equal(res.body.success, false);
    assert.equal(res.body.error.code, 'NOT_FOUND');
    assert.equal(res.body.error.requestId, res.headers['x-request-id']);
  });

  it('rejects malformed JSON with 400', async () => {
    const res = await request(app)
      .post('/api/v1/health')
      .set('Content-Type', 'application/json')
      .send('{"broken":');

    assert.equal(res.status, 400);
    assert.equal(res.body.error.code, 'INVALID_JSON');
  });

  it('rejects bodies larger than the configured limit with 413', async () => {
    const res = await request(app)
      .post('/api/v1/health')
      .set('Content-Type', 'application/json')
      .send(JSON.stringify({ data: 'x'.repeat(200 * 1024) }));

    assert.equal(res.status, 413);
    assert.equal(res.body.error.code, 'PAYLOAD_TOO_LARGE');
  });
});

describe('security headers', () => {
  it('sets helmet headers and hides the framework', async () => {
    const res = await request(app).get('/api/v1/health');

    assert.equal(res.headers['x-content-type-options'], 'nosniff');
    assert.ok(res.headers['strict-transport-security']);
    assert.equal(res.headers['x-powered-by'], undefined);
  });

  it('sends rate limit headers', async () => {
    const res = await request(app).get('/api/v1/health');
    assert.ok(res.headers['ratelimit-policy']);
  });
});

describe('CORS', () => {
  it('allows FRONTEND_URL with credentials', async () => {
    const res = await request(app).get('/api/v1/health').set('Origin', 'http://localhost:3000');

    assert.equal(res.headers['access-control-allow-origin'], 'http://localhost:3000');
    assert.equal(res.headers['access-control-allow-credentials'], 'true');
  });

  it('answers preflight requests from FRONTEND_URL', async () => {
    const res = await request(app)
      .options('/api/v1/health')
      .set('Origin', 'http://localhost:3000')
      .set('Access-Control-Request-Method', 'POST')
      .set('Access-Control-Request-Headers', 'Content-Type');

    assert.equal(res.status, 204);
    assert.equal(res.headers['access-control-allow-origin'], 'http://localhost:3000');
    assert.match(res.headers['access-control-allow-methods'], /POST/);
  });

  it('does not grant access to other origins', async () => {
    const res = await request(app).get('/api/v1/health').set('Origin', 'https://evil.example');
    assert.equal(res.headers['access-control-allow-origin'], undefined);
  });
});
