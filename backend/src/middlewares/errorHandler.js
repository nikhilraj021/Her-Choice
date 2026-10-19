import { Prisma } from '@prisma/client';
import { env } from '../config/env.js';
import { ApiError } from '../utils/ApiError.js';
import { buildErrorBody } from '../utils/apiResponse.js';

// Errors raised by Express's body parsers before a route runs
const BODY_PARSER_ERRORS = {
  'entity.parse.failed': [400, 'INVALID_JSON', 'Request body contains invalid JSON'],
  'entity.too.large': [413, 'PAYLOAD_TOO_LARGE', 'Request body is too large'],
  'encoding.unsupported': [415, 'UNSUPPORTED_ENCODING', 'Unsupported request body encoding'],
  'charset.unsupported': [415, 'UNSUPPORTED_CHARSET', 'Unsupported request body charset'],
  'parameters.too.many': [413, 'TOO_MANY_PARAMETERS', 'Too many request parameters'],
};

// Safety net for Prisma errors that a service did not translate itself.
// Services should still catch expected cases (e.g. duplicate email) to give specific messages.
const PRISMA_KNOWN_ERRORS = {
  P2000: () => ApiError.badRequest('A value is too long for its field'),
  P2002: () => ApiError.conflict('A record with the same unique value already exists'),
  P2003: () => ApiError.conflict('This operation conflicts with related records'),
  P2025: () => ApiError.notFound('The requested record was not found'),
};

// Connection-level failures: the database is unreachable or overloaded
const PRISMA_UNAVAILABLE_CODES = new Set(['P1001', 'P1002', 'P1008', 'P1017', 'P2024']);

function fromPrismaError(err) {
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (PRISMA_UNAVAILABLE_CODES.has(err.code)) return ApiError.serviceUnavailable();
    return PRISMA_KNOWN_ERRORS[err.code]?.() ?? null;
  }
  if (err instanceof Prisma.PrismaClientInitializationError) {
    return ApiError.serviceUnavailable();
  }
  return null;
}

function normalize(err) {
  if (err instanceof ApiError) return err;

  const parserError = BODY_PARSER_ERRORS[err?.type];
  if (parserError) return new ApiError(...parserError);

  return fromPrismaError(err);
}

// Express identifies error handlers by their 4-argument signature, so `next` must stay
export function errorHandler(err, req, res, next) {
  const known = normalize(err);
  const statusCode = known?.statusCode ?? 500;

  if (statusCode >= 500) {
    req.log?.error({ err }, known ? known.message : 'Unhandled error');
  }

  if (res.headersSent) {
    return res.end();
  }

  const body = known
    ? buildErrorBody({
        code: known.code,
        message: known.message,
        details: known.details,
        requestId: req.id,
      })
    : buildErrorBody({
        code: 'INTERNAL_SERVER_ERROR',
        // Never leak internal messages or stack traces to clients in production
        message: env.isProduction ? 'Something went wrong' : err?.message || 'Something went wrong',
        requestId: req.id,
      });

  return res.status(statusCode).json(body);
}
