import pino from 'pino';
import { env } from '../config/env.js';

export const logger = pino({
  level: env.isTest ? 'silent' : env.LOG_LEVEL,
  // Never write credentials, session tokens or payment secrets to logs,
  // even if a future log call includes a request, body or config object.
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers.cookie',
      'req.headers["x-razorpay-signature"]',
      'res.headers["set-cookie"]',
      'headers.authorization',
      'headers.cookie',
      'body.password',
      'body.currentPassword',
      'body.newPassword',
      'body.razorpay_signature',
      '*.password',
      '*.passwordHash',
      '*.currentPassword',
      '*.newPassword',
      '*.token',
      '*.accessToken',
      '*.refreshToken',
      '*.secret',
      '*.apiKey',
      '*.apiSecret',
      '*.keySecret',
      '*.webhookSecret',
      '*.razorpay_signature',
      '*.cardNumber',
      '*.cvv',
    ],
    censor: '[REDACTED]',
  },
  // pino-pretty is a dev dependency, so it is only loaded during local development
  transport:
    env.NODE_ENV === 'development'
      ? { target: 'pino-pretty', options: { colorize: true, translateTime: 'SYS:HH:MM:ss' } }
      : undefined,
});
