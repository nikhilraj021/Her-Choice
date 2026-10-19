// Preloaded via `node --import` before any test file, so src/config/env.js
// sees a deterministic test environment and does not read the local .env file.
process.env.NODE_ENV = 'test';
process.env.CORS_ORIGINS = 'http://localhost:3000';
