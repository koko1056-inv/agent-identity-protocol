import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';

export interface APIError {
  error: string;
  code?: string;
  details?: any;
}

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) {
  console.error('Error:', err);

  // Zod validation errors
  if (err instanceof ZodError) {
    return res.status(400).json({
      error: 'Validation failed',
      code: 'VALIDATION_ERROR',
      details: err.errors,
    } as APIError);
  }

  // Custom API errors
  if ('statusCode' in err) {
    return res.status((err as any).statusCode).json({
      error: err.message,
      code: (err as any).code,
    } as APIError);
  }

  // Default 500 error
  res.status(500).json({
    error: 'Internal server error',
    code: 'INTERNAL_ERROR',
  } as APIError);
}

export class NotFoundError extends Error {
  statusCode = 404;
  code = 'NOT_FOUND';
  constructor(message: string = 'Resource not found') {
    super(message);
  }
}

export class ConflictError extends Error {
  statusCode = 409;
  code = 'CONFLICT';
  constructor(message: string = 'Resource already exists') {
    super(message);
  }
}

export class BadRequestError extends Error {
  statusCode = 400;
  code = 'BAD_REQUEST';
  constructor(message: string = 'Bad request') {
    super(message);
  }
}
