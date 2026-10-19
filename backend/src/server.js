import { createApp } from './app.js';
import { connectDatabase, disconnectDatabase } from './config/database.js';
import { env } from './config/env.js';
import { logger } from './utils/logger.js';

const SHUTDOWN_TIMEOUT_MS = 10_000;

let server;
let shuttingDown = false;

// Prisma wraps driver failures (wrong password, unknown database, refused connection) several levels deep
function databaseErrorReason(err) {
  const cause = err?.meta?.driverAdapterError?.cause;
  const reason = (typeof cause?.cause === 'string' && cause.cause) || cause?.message || err?.message;
  return reason?.split('\n')[0].trim();
}

function listen(app) {
  return new Promise((resolve, reject) => {
    // Express 5 also invokes this callback when listening fails (e.g. EADDRINUSE)
    const httpServer = app.listen(env.PORT, (err) => (err ? reject(err) : resolve(httpServer)));
  });
}

async function start() {
  try {
    await connectDatabase();
    logger.info('Connected to MySQL');
  } catch (err) {
    logger.fatal(
      { err },
      `Could not connect to the database: ${databaseErrorReason(err)}. ` +
        'Check that MySQL is running and DATABASE_URL in .env is correct.',
    );
    await disconnectDatabase().catch(() => {});
    process.exit(1);
  }

  try {
    server = await listen(createApp());
    logger.info(`API listening on http://localhost:${env.PORT}/api/v1 (${env.NODE_ENV})`);
  } catch (err) {
    const hint =
      err.code === 'EADDRINUSE'
        ? ` Port ${env.PORT} is already in use: stop the other process or set PORT in .env.`
        : '';
    logger.fatal({ err }, `Failed to start HTTP server.${hint}`);
    await disconnectDatabase().catch(() => {});
    process.exit(1);
  }
}

function closeServer() {
  return new Promise((resolve, reject) => {
    if (!server) return resolve();
    // Stops accepting new connections; resolves once in-flight requests have finished
    server.close((err) => (err ? reject(err) : resolve()));
  });
}

async function shutdown(signal, exitCode = 0) {
  if (shuttingDown) return;
  shuttingDown = true;
  logger.info(`${signal} received, shutting down gracefully`);

  setTimeout(() => {
    logger.error('Graceful shutdown timed out, forcing exit');
    process.exit(1);
  }, SHUTDOWN_TIMEOUT_MS).unref();

  try {
    await closeServer();
    await disconnectDatabase();
    logger.info('Shutdown complete');
  } catch (err) {
    logger.error({ err }, 'Error during shutdown');
    exitCode = 1;
  }

  process.exit(exitCode);
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

// The process state is unknown after these, so log, release resources and exit with failure
process.on('unhandledRejection', (reason) => {
  logger.fatal({ err: reason }, 'Unhandled promise rejection');
  shutdown('unhandledRejection', 1);
});

process.on('uncaughtException', (err) => {
  logger.fatal({ err }, 'Uncaught exception');
  shutdown('uncaughtException', 1);
});

start();
