import { ApiError } from '../utils/ApiError.js';

const LOCATIONS = ['params', 'query', 'body'];

/**
 * Validates route params, query string and body against Zod schemas.
 * Parsed (coerced, stripped) values are exposed on `req.validated` because
 * Express 5 makes `req.query` read-only. Handlers must read from `req.validated`.
 *
 * Usage: router.get('/:id', validate({ params: idSchema }), handler)
 */
export function validate(schemas) {
  return (req, res, next) => {
    const validated = {};
    const details = [];

    for (const location of LOCATIONS) {
      const schema = schemas[location];
      if (!schema) continue;

      const result = schema.safeParse(req[location] ?? {});
      if (result.success) {
        validated[location] = result.data;
      } else {
        for (const issue of result.error.issues) {
          details.push({ location, path: issue.path.join('.'), message: issue.message });
        }
      }
    }

    if (details.length > 0) {
      return next(ApiError.validation(details));
    }

    req.validated = validated;
    return next();
  };
}
