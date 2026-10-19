import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { parseEnv } from '../../src/config/env.js';

const valid = {
  NODE_ENV: 'development',
  FRONTEND_URL: 'http://localhost:3000',
  DATABASE_URL: 'mysql://user:pass@localhost:3306/her_choice',
};

describe('parseEnv', () => {
  it('applies defaults', () => {
    const env = parseEnv(valid);

    assert.equal(env.PORT, 5000);
    assert.equal(env.DATABASE_SSL, false);
    assert.equal(env.DB_CONNECTION_LIMIT, 10);
    assert.equal(env.isProduction, false);
  });

  it('normalizes FRONTEND_URL to an origin so it matches the browser Origin header', () => {
    const env = parseEnv({ ...valid, FRONTEND_URL: 'http://localhost:3000/some/path/' });
    assert.equal(env.FRONTEND_URL, 'http://localhost:3000');
  });

  it('requires DATABASE_URL', () => {
    const { DATABASE_URL, ...withoutDatabase } = valid;
    assert.ok(DATABASE_URL);
    assert.throws(() => parseEnv(withoutDatabase), /DATABASE_URL is required/);
  });

  it('rejects non-MySQL and database-less URLs', () => {
    assert.throws(() => parseEnv({ ...valid, DATABASE_URL: 'postgres://u:p@localhost/db' }), /mysql:\/\//);
    assert.throws(() => parseEnv({ ...valid, DATABASE_URL: 'mysql://u:p@localhost:3306' }), /database name/);
  });

  it('requires FRONTEND_URL to be an http(s) URL', () => {
    assert.throws(() => parseEnv({ ...valid, FRONTEND_URL: 'not a url' }), /FRONTEND_URL/);
  });

  it('requires https FRONTEND_URL and database TLS for remote hosts in production', () => {
    const production = {
      NODE_ENV: 'production',
      FRONTEND_URL: 'http://shop.example.com',
      DATABASE_URL: 'mysql://u:p@db.example.com:3306/shop',
    };

    assert.throws(() => parseEnv(production), (err) => {
      assert.match(err.message, /FRONTEND_URL must use https/);
      assert.match(err.message, /DATABASE_SSL must be true/);
      return true;
    });

    const env = parseEnv({ ...production, FRONTEND_URL: 'https://shop.example.com', DATABASE_SSL: 'true' });
    assert.equal(env.isProduction, true);
    assert.equal(env.DATABASE_SSL, true);
  });
});
