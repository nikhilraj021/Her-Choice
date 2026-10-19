/**
 * An error whose status, code and message are safe to send to the client.
 * Anything thrown that is not an ApiError is treated as an internal error.
 */
export class ApiError extends Error {
  constructor(statusCode, code, message, details) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }

  static badRequest(message = 'Bad request', details) {
    return new ApiError(400, 'BAD_REQUEST', message, details);
  }

  static unauthorized(message = 'Authentication required') {
    return new ApiError(401, 'UNAUTHORIZED', message);
  }

  static forbidden(message = 'You do not have permission to perform this action') {
    return new ApiError(403, 'FORBIDDEN', message);
  }

  static notFound(message = 'Resource not found') {
    return new ApiError(404, 'NOT_FOUND', message);
  }

  static conflict(message = 'Conflict', details) {
    return new ApiError(409, 'CONFLICT', message, details);
  }

  static validation(details, message = 'Validation failed') {
    return new ApiError(422, 'VALIDATION_ERROR', message, details);
  }
}
