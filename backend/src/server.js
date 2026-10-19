import app from './app.js';
import { env } from './config/env.js';
import { pool, checkDbConnection } from './config/db.js';

try {
  await checkDbConnection();
  console.log(`MySQL connected (${env.db.host}:${env.db.port}/${env.db.database})`);
} catch (err) {
  console.warn(`MySQL not reachable: ${err.message}`);
}

const server = app.listen(env.port, () => {
  console.log(`API listening on http://localhost:${env.port}`);
});

server.on('error', (err) => {
  console.error(`Failed to start server: ${err.message}`);
  process.exit(1);
});

function shutdown() {
  server.close(async () => {
    await pool.end();
    process.exit(0);
  });
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
