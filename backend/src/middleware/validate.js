import { ApiError } from '../utils/ApiError.js';

/**
 * Validates req[source] against a zod schema and replaces it with the parsed value.
 * Usage: router.post('/', validate(createProductSchema), controller)
 */
export function validate(schema, source = 'body') {
  return (req, res, next) => {
    const result = schema.safeParse(req[source]);
    if (!result.success) {
      const details = result.error.issues.map((issue) => ({
        path: issue.path.join('.'),
        message: issue.message,
      }));
      return next(ApiError.validation(details));
    }
    // Express 5 defines req.query as a getter, so redefine the property instead of assigning it.
    Object.defineProperty(req, source, { value: result.data, writable: true, enumerable: true });
    next();
  };
}
