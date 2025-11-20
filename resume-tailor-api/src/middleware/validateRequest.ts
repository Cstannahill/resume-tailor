import type { RequestHandler } from 'express';
import type { ParsedQs } from 'qs';
import type { AnyZodObject, ZodEffects } from 'zod';
import { HttpError } from './errorHandler.js';

type Schema<T> = AnyZodObject | ZodEffects<AnyZodObject, T>;

const parse = <T>(schema: Schema<T>, data: unknown) => {
  const result = schema.safeParse(data);
  if (!result.success) {
    throw new HttpError(400, 'Validation failed', result.error.issues);
  }

  return result.data;
};

export const validateBody = <T>(schema: Schema<T>): RequestHandler => (req, _res, next) => {
  try {
    req.body = parse(schema, req.body);
    next();
  } catch (error) {
    next(error);
  }
};

export const validateQuery = <T>(schema: Schema<T>): RequestHandler => (req, _res, next) => {
  try {
    req.query = parse(schema, req.query) as unknown as ParsedQs;
    next();
  } catch (error) {
    next(error);
  }
};
