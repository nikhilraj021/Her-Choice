import { createApp } from './app.js';
import { env } from './config/env.js';
import { logger } from './utils/logger.js';

const SHUTDOWN_TIMEOUT_MS = 10_000;

const app = createApp();

// Express 5 also invokes this callback when listening fails (e.g. EADDRINUSE)
const server = app.listen(env.PORT, (err) => {
  if (err) {
    const hint =
      err.code === 'EADDRINUSE'
        ? ` Port ${env.PORT} is already in use: stop the other process or set PORT in .env.`
        : '';
    logger.fatal({ err }, `Failed to start HTTP server.${hint}`);
    process.exit(1);
  }
  logger.info(`API listening on http://localhost:${env.PORT} (${env.NODE_ENV})`);
});

let shuttingDown = false;

function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;
  logger.info(`${signal} received, shutting down gracefully`);

  // Stop accepting new connections and let in-flight requests finish
  server.close((err) => {
    if (err) {
      logger.error({ err }, 'Error while closing HTTP server');
      process.exit(1);
    }
    // Database and other resource cleanup is registered here by later modules
    process.exit(0);
  });

  setTimeout(() => {
    logger.error('Graceful shutdown timed out, forcing exit');
    process.exit(1);
  }, SHUTDOWN_TIMEOUT_MS).unref();
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

process.on('unhandledRejection', (reason) => {
  logger.fatal({ err: reason }, 'Unhandled promise rejection');
  process.exit(1);
});

process.on('uncaughtException', (err) => {
  logger.fatal({ err }, 'Uncaught exception');
  process.exit(1);
});
