import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';

/**
 * Add unique request ID to each request for logging/debugging
 */
export function requestIdMiddleware(req: Request, res: Response, next: NextFunction) {
  const requestId = req.headers['x-request-id'] as string || randomUUID();
  req.headers['x-request-id'] = requestId;
  res.setHeader('x-request-id', requestId);
  next();
}
