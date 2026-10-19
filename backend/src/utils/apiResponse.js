/**
 * Every successful response uses the same envelope:
 *   { success: true, data, message?, meta? }
 * `meta` carries pagination and similar non-resource information.
 */
export function sendSuccess(res, data, { status = 200, message, meta } = {}) {
  const body = { success: true, data };
  if (message) body.message = message;
  if (meta) body.meta = meta;
  return res.status(status).json(body);
}

/**
 * Every error response uses the same envelope:
 *   { success: false, error: { code, message, details?, requestId } }
 */
export function buildErrorBody({ code, message, details, requestId }) {
  const error = { code, message };
  if (details !== undefined) error.details = details;
  if (requestId) error.requestId = requestId;
  return { success: false, error };
}
