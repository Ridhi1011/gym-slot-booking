import { z } from 'zod';
import { AppError } from '../lib/errors.js';

// validate({ body, params, query }) — each is an optional zod schema.
// Parsed (and coerced) values are put on req.valid so routes never touch raw input.
export function validate(schemas) {
  return (req, res, next) => {
    req.valid = {};
    for (const part of ['params', 'query', 'body']) {
      const schema = schemas[part];
      if (!schema) continue;
      const result = schema.safeParse(req[part] ?? {});
      if (!result.success) {
        const issue = result.error.issues[0];
        const field = issue.path.join('.');
        const message = field ? `${field}: ${issue.message}` : issue.message;
        return next(new AppError(422, 'VALIDATION_ERROR', message));
      }
      req.valid[part] = result.data;
    }
    next();
  };
}

// Common param schema for routes like /sessions/:id
export const idParams = z.object({ id: z.coerce.number().int().positive() });
