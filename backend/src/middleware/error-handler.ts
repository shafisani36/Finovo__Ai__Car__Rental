import { captureError } from '../infrastructure/monitoring/monitoring';
import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';
import { AppError } from '../shared/errors/app-error';

export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction): void {
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

  // Request body too large / malformed JSON (from express.json)
  const bodyError = err as { type?: string; status?: number };
  if (bodyError?.type === 'entity.too.large') {
    res.status(413).json({ success: false, error: { code: 'PAYLOAD_TOO_LARGE', message: 'The uploaded data is too large.' } });
    return;
  }
  if (bodyError?.type === 'entity.parse.failed') {
    res.status(400).json({ success: false, error: { code: 'INVALID_JSON', message: 'The request body is not valid JSON.' } });
    return;
  }

  // Common database errors mapped to clear HTTP answers
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      res.status(409).json({ success: false, error: { code: 'ALREADY_EXISTS', message: 'A record with these details already exists.' } });
      return;
    }
    if (err.code === 'P2025') {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'The requested record was not found.' } });
      return;
    }
    if (err.code === 'P2003') {
      res.status(409).json({ success: false, error: { code: 'IN_USE', message: 'This record is linked to other records and cannot be changed.' } });
      return;
    }
    if (err.code === 'P2034') {
      res.status(409).json({ success: false, error: { code: 'CONFLICT', message: 'Another request changed this record at the same time. Please try again.' } });
      return;
    }
    if (err.code === 'P2000') {
      res.status(400).json({ success: false, error: { code: 'VALUE_TOO_LONG', message: 'One of the values is too long.' } });
      return;
    }
  }

  // Wrong or missing fields that reached the database layer are a bad request, not a server crash
  if (err instanceof Prisma.PrismaClientValidationError) {
    console.warn('[Rejected request] invalid data for the database:', err.message.split('\n').slice(-1)[0]);
    res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Some of the submitted data is missing or invalid.' } });
    return;
  }

  // Handle unexpected errors
  console.error('[Unhandled Exception]:', err);
  captureError(err, { method: req.method, path: req.originalUrl.split('?')[0] });

  const isDev = process.env.NODE_ENV !== 'production';
  res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: isDev && err instanceof Error ? err.message : 'An unexpected error occurred. Please try again later.',
    },
  });
}
