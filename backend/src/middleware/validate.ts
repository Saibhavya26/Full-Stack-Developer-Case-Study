import { NextFunction, Request, Response } from 'express';
import { AnyZodObject, ZodError } from 'zod';
import { ApiError } from '../utils/ApiError';

type RequestPart = 'body' | 'query' | 'params';

/**
 * Validates and (importantly) replaces req[part] with the parsed/coerced
 * data from the Zod schema, so controllers can trust types downstream.
 */
export function validate(schema: AnyZodObject, part: RequestPart = 'body') {
  return (req: Request, _res: Response, next: NextFunction) => {
    try {
      const parsed = schema.parse(req[part]);
      (req as unknown as Record<RequestPart, unknown>)[part] = parsed;
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        return next(
          ApiError.badRequest(
            'Validation failed',
            err.issues.map((issue) => ({
              path: issue.path.join('.'),
              message: issue.message,
            }))
          )
        );
      }
      next(err);
    }
  };
}
