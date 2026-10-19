import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import express from 'express';
import request from 'supertest';
import { z } from 'zod';
import { errorHandler } from '../src/middlewares/errorHandler.js';
import { validate } from '../src/middlewares/validate.js';

function buildApp() {
  const app = express();
  app.use(express.json());
  app.post(
    '/items/:id',
    validate({
      params: z.object({ id: z.coerce.number().int().positive() }),
      query: z.object({ page: z.coerce.number().int().min(1).default(1) }),
      body: z.object({ name: z.string().trim().min(1) }),
    }),
    (req, res) => res.json(req.validated),
  );
  app.use(errorHandler);
  return app;
}

describe('validate middleware', () => {
  const app = buildApp();

  it('exposes coerced, stripped values on req.validated', async () => {
    const res = await request(app).post('/items/42').send({ name: '  Silk scarf ', role: 'ADMIN' });

    assert.equal(res.status, 200);
    assert.deepEqual(res.body, {
      params: { id: 42 },
      query: { page: 1 },
      body: { name: 'Silk scarf' }, // unknown keys such as `role` are stripped
    });
  });

  it('reports every invalid location in one response', async () => {
    const res = await request(app).post('/items/abc?page=0').send({ name: '' });

    assert.equal(res.status, 400);
    assert.equal(res.body.error.code, 'VALIDATION_ERROR');
    const locations = res.body.error.details.map((d) => d.location).sort();
    assert.deepEqual(locations, ['body', 'params', 'query']);
  });
});
