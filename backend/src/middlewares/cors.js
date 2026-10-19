import cors from 'cors';
import { env } from '../config/env.js';

const allowedOrigins = new Set(env.CORS_ORIGINS);

export const corsMiddleware = cors({
  origin(origin, callback) {
    // Requests without an Origin header (curl, server-to-server, same-origin navigation)
    // are not subject to CORS. Unknown browser origins simply receive no CORS headers,
    // so the browser blocks them from reading the response.
    callback(null, !origin || allowedOrigins.has(origin));
  },
  credentials: true, // required for the HTTP-only auth cookies
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'X-Request-Id', 'Idempotency-Key'],
  exposedHeaders: ['X-Request-Id', 'RateLimit', 'RateLimit-Policy', 'Retry-After'],
  maxAge: 600,
});
