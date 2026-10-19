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

function normalize(err) {
  if (err instanceof ApiError) return err;

  const parserError = BODY_PARSER_ERRORS[err?.type];
  if (parserError) return new ApiError(...parserError);

  return null;
}

// Express identifies error handlers by their 4-argument signature, so `next` must stay
export function errorHandler(err, req, res, next) {
  const known = normalize(err);
  const statusCode = known?.statusCode ?? 500;

  if (statusCode >= 500) {
    req.log?.error({ err }, 'Unhandled error');
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
