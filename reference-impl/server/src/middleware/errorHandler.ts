import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { logger } from '../utils/logger';

export interface APIError {
  error: string;
  code?: string;
  details?: any;
  requestId?: string;
}

export function errorHandler(err: Error, req: Request, res: Response, next: NextFunction) {
  const requestId = req.headers['x-request-id'] as string;

  // Log error with context
  logger.error('Request failed', {
    error: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    path: req.path,
    method: req.method,
    requestId,
  });

  // Zod validation errors
  if (err instanceof ZodError) {
    const formattedErrors = err.errors.map((e) => ({
      path: e.path.join('.'),
      message: e.message,
      code: e.code,
    }));

    return res.status(400).json({
      error: 'Validation failed',
      code: 'VALIDATION_ERROR',
      details: formattedErrors,
      requestId,
    } as APIError);
  }

  // Custom API errors
  if ('statusCode' in err) {
    const statusCode = (err as any).statusCode;
    return res.status(statusCode).json({
      error: err.message,
      code: (err as any).code,
      requestId,
    } as APIError);
  }

  // Prisma errors (database)
  if (err.constructor.name.includes('Prisma')) {
    logger.error('Database error', { error: err.message, requestId });
    return res.status(500).json({
      error: 'Database operation failed',
      code: 'DATABASE_ERROR',
      requestId,
    } as APIError);
  }

  // Syntax/JSON parsing errors
  if (err instanceof SyntaxError && 'body' in err) {
    return res.status(400).json({
      error: 'Invalid JSON in request body',
      code: 'INVALID_JSON',
      requestId,
    } as APIError);
  }

  // Default 500 error (don't leak internal details in production)
  const errorMessage =
    process.env.NODE_ENV === 'development' ? err.message : 'An unexpected error occurred';

  res.status(500).json({
    error: errorMessage,
    code: 'INTERNAL_ERROR',
    requestId,
  } as APIError);
}

// Custom error classes

export class NotFoundError extends Error {
  statusCode = 404;
  code = 'NOT_FOUND';
  constructor(message: string = 'Resource not found') {
    super(message);
    this.name = 'NotFoundError';
  }
}

export class ConflictError extends Error {
  statusCode = 409;
  code = 'CONFLICT';
  constructor(message: string = 'Resource already exists') {
    super(message);
    this.name = 'ConflictError';
  }
}

export class BadRequestError extends Error {
  statusCode = 400;
  code = 'BAD_REQUEST';
  constructor(message: string = 'Bad request') {
    super(message);
    this.name = 'BadRequestError';
  }
}

export class UnauthorizedError extends Error {
  statusCode = 401;
  code = 'UNAUTHORIZED';
  constructor(message: string = 'Authentication required') {
    super(message);
    this.name = 'UnauthorizedError';
  }
}

export class ForbiddenError extends Error {
  statusCode = 403;
  code = 'FORBIDDEN';
  constructor(message: string = 'Access denied') {
    super(message);
    this.name = 'ForbiddenError';
  }
}

export class RateLimitError extends Error {
  statusCode = 429;
  code = 'RATE_LIMIT_EXCEEDED';
  constructor(message: string = 'Too many requests, please try again later') {
    super(message);
    this.name = 'RateLimitError';
  }
}
