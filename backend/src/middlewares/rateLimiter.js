import { rateLimit } from 'express-rate-limit';
import { env } from '../config/env.js';
import { ApiError } from '../utils/ApiError.js';

/**
 * Builds a rate limiter that reports through the standard error envelope.
 * Stricter instances (login, password reset, checkout) are created by their modules.
 * Note: the default in-memory store is per process; use a shared store (e.g. Redis)
 * when running more than one API instance.
 */
export function createRateLimiter({ windowMs, limit, message }) {
  return rateLimit({
    windowMs,
    limit,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    handler(req, res, next) {
      next(ApiError.tooManyRequests(message));
    },
  });
}

export const globalRateLimiter = createRateLimiter({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  limit: env.RATE_LIMIT_MAX,
});
