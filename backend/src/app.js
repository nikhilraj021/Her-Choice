import compression from 'compression';
import cookieParser from 'cookie-parser';
import express from 'express';
import helmet from 'helmet';
import { env } from './config/env.js';
import { corsMiddleware } from './middlewares/cors.js';
import { errorHandler } from './middlewares/errorHandler.js';
import { httpLogger } from './middlewares/httpLogger.js';
import { notFound } from './middlewares/notFound.js';
import { globalRateLimiter } from './middlewares/rateLimiter.js';
import { apiRouter } from './routes/index.js';

export const API_PREFIX = '/api/v1';

/**
 * Builds the Express application without binding a port,
 * so tests can exercise it in-process with supertest.
 */
export function createApp() {
  const app = express();

  app.set('trust proxy', env.TRUST_PROXY);
  app.disable('x-powered-by');

  app.use(httpLogger);
  app.use(helmet());
  app.use(corsMiddleware);
  app.use(compression());
  app.use(API_PREFIX, globalRateLimiter);

  // The Razorpay webhook route needs the raw body for signature verification,
  // so the payments module will mount it here, before the JSON parser.

  app.use(express.json({ limit: env.BODY_SIZE_LIMIT }));
  app.use(express.urlencoded({ extended: false, limit: env.BODY_SIZE_LIMIT, parameterLimit: 100 }));
  app.use(cookieParser());

  app.use(API_PREFIX, apiRouter);

  app.use(notFound);
  app.use(errorHandler);

  return app;
}
