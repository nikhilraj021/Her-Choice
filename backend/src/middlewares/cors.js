import cors from 'cors';
import { env } from '../config/env.js';

export const corsMiddleware = cors({
  origin(origin, callback) {
    // Requests without an Origin header (curl, server-to-server, same-origin navigation)
    // are not subject to CORS. Other browser origins simply receive no CORS headers,
    // so the browser blocks them from reading the response.
    callback(null, !origin || origin === env.FRONTEND_URL);
  },
  credentials: true, // required for the HTTP-only auth cookies
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'X-Request-Id', 'Idempotency-Key'],
  exposedHeaders: ['X-Request-Id', 'RateLimit', 'RateLimit-Policy', 'Retry-After'],
  maxAge: 600,
});
