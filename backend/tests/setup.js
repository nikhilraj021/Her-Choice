// Preloaded via `node --import` before any test file, so src/config/env.js
// sees a deterministic test environment and does not read the local .env file.
process.env.NODE_ENV = 'test';
process.env.FRONTEND_URL = 'http://localhost:3000';
// Never connected to by the test suite: database access is replaced with test doubles.
// Port 1 is unused, so an accidental real query fails immediately instead of touching a database.
process.env.DATABASE_URL = 'mysql://test:test@127.0.0.1:1/her_choice_test';
process.env.DB_CONNECT_TIMEOUT_MS = '1000';
