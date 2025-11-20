import type { ErrorRequestHandler } from 'express';
import { logger } from '../config/logger.js';

export class HttpError extends Error {
  public readonly status: number;
  public readonly details?: unknown;

  constructor(status: number, message: string, details?: unknown) {
    super(message);
    this.status = status;
    this.details = details;
    this.name = 'HttpError';
  }
}

export const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  const status = err instanceof HttpError ? err.status : 500;
  const message = err instanceof HttpError ? err.message : 'Internal Server Error';
  const details = err instanceof HttpError ? err.details : undefined;

  if (status >= 500) {
    logger.error({ err, path: req.path }, 'Unhandled error');
  } else {
    logger.warn({ err, path: req.path }, 'Handled error');
  }

  res.status(status).json({
    error: {
      message,
      details
    }
  });
};
