import assert from 'node:assert/strict';
import { after, afterEach, describe, it, mock } from 'node:test';
import request from 'supertest';
import { createApp } from '../../src/app.js';
import { disconnectDatabase } from '../../src/config/database.js';
import { healthService } from '../../src/services/health.service.js';

const app = createApp();

afterEach(() => mock.restoreAll());
after(() => disconnectDatabase());

describe('GET /api/v1/health', () => {
  it('returns 200 with dependency checks when the database is up', async () => {
    mock.method(healthService, 'checkDatabase', async () => ({ status: 'up', latencyMs: 3 }));

    const res = await request(app).get('/api/v1/health');

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.status, 'ok');
    assert.deepEqual(res.body.data.checks, { database: { status: 'up', latencyMs: 3 } });
    assert.equal(typeof res.body.data.uptimeSeconds, 'number');
    assert.ok(!Number.isNaN(Date.parse(res.body.data.timestamp)));
  });

  it('is never cached', async () => {
    mock.method(healthService, 'checkDatabase', async () => ({ status: 'up', latencyMs: 1 }));

    const res = await request(app).get('/api/v1/health');
    assert.equal(res.headers['cache-control'], 'no-store');
  });

  it('returns 503 in the error envelope when the database is down', async () => {
    mock.method(healthService, 'checkDatabase', async () => ({ status: 'down' }));

    const res = await request(app).get('/api/v1/health');

    assert.equal(res.status, 503);
    assert.equal(res.body.success, false);
    assert.equal(res.body.error.code, 'SERVICE_UNAVAILABLE');
    assert.equal(res.body.error.details.checks.database.status, 'down');
    assert.equal(res.body.error.requestId, res.headers['x-request-id']);
  });

  it('reports the database as down, without leaking driver details, when it is unreachable', async () => {
    // No mock: the real ping runs against the unreachable test DATABASE_URL
    const res = await request(app).get('/api/v1/health');

    assert.equal(res.status, 503);
    assert.deepEqual(res.body.error.details.checks.database, { status: 'down' });
    assert.doesNotMatch(JSON.stringify(res.body), /127\.0\.0\.1|ECONNREFUSED|test@/);
  });
});
