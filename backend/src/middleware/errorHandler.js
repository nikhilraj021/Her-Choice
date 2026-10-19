import { env } from '../config/env.js';
import { ApiError } from '../utils/ApiError.js';
import { sendError } from '../utils/apiResponse.js';

// Errors raised by express.json() before a request reaches a route.
const BODY_PARSER_ERRORS = {
  'entity.parse.failed': [400, 'INVALID_JSON', 'Request body is not valid JSON'],
  'entity.too.large': [413, 'PAYLOAD_TOO_LARGE', 'Request body is too large'],
  'encoding.unsupported': [415, 'UNSUPPORTED_ENCODING', 'Unsupported content encoding'],
  'charset.unsupported': [415, 'UNSUPPORTED_CHARSET', 'Unsupported charset'],
};

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  if (res.headersSent) {
    // The response is already partly sent; the only safe option is to drop the connection.
    req.socket.destroy();
    return;
  }

  if (err instanceof ApiError) {
    const { code, message, details } = err;
    return sendError(res, err.statusCode, { code, message, details });
  }

  const parserError = BODY_PARSER_ERRORS[err?.type];
  if (parserError) {
    const [statusCode, code, message] = parserError;
    return sendError(res, statusCode, { code, message });
  }

  // Unexpected error: log everything server-side, send nothing internal to the client in production.
  console.error(`[${req.method} ${req.originalUrl}]`, err);

  return sendError(res, 500, {
    code: 'INTERNAL_ERROR',
    message: env.isProduction ? 'Internal server error' : err?.message || 'Internal server error',
    stack: env.isProduction ? undefined : err?.stack,
  });
}
