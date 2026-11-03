import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { AppError } from '../shared/errors/app-error';

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction): void {
  // Handle Zod validation errors
  if (err instanceof ZodError) {
    const formattedErrors = err.errors.map((e) => ({
      field: e.path.join('.'),
      message: e.message,
    }));

    res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: err.errors[0]?.message || 'Input validation failed',
        details: formattedErrors,
      },
    });
    return;
  }

  // Handle known operational AppErrors
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      success: false,
      error: {
        code: err.code,
        message: err.message,
        details: err.details,
      },
    });
    return;
  }

  // Handle unexpected errors
  console.error('[Unhandled Exception]:', err);

  const isDev = process.env.NODE_ENV !== 'production';
  res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: isDev && err instanceof Error ? err.message : 'An unexpected error occurred. Please try again later.',
    },
  });
}
