/**
 * Every response body has one of two shapes:
 *   success: { success: true,  data, meta? }
 *   failure: { success: false, error: { code, message, details? } }
 */
export function sendSuccess(res, data = null, { statusCode = 200, meta } = {}) {
  const body = { success: true, data };
  if (meta !== undefined) body.meta = meta;
  return res.status(statusCode).json(body);
}

export function sendError(res, statusCode, { code, message, details, stack }) {
  const error = { code, message };
  if (details !== undefined) error.details = details;
  if (stack !== undefined) error.stack = stack;
  return res.status(statusCode).json({ success: false, error });
}
