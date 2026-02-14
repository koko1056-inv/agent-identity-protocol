/**
 * Admin authentication middleware
 * Simple master key protection for admin endpoints
 */

import { Request, Response, NextFunction } from 'express';
import { UnauthorizedError } from './errorHandler';
import { logger } from '../utils/logger';

const ADMIN_KEY = process.env.ADMIN_KEY;

/**
 * Require admin authentication
 * Set ADMIN_KEY environment variable to enable protection
 */
export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  // If no ADMIN_KEY is set, allow access (for development)
  if (!ADMIN_KEY) {
    logger.warn('Admin API accessed without ADMIN_KEY protection');
    return next();
  }

  const authHeader = req.headers.authorization;

  if (!authHeader) {
    throw new UnauthorizedError('Admin authentication required. Set Authorization header.');
  }

  // Support both "Bearer <key>" and "Admin <key>"
  const match = authHeader.match(/^(Bearer|Admin)\s+(.+)$/i);
  const providedKey = match ? match[2] : null;

  if (!providedKey || providedKey !== ADMIN_KEY) {
    logger.warn('Invalid admin key attempt', {
      ip: req.ip,
      path: req.path,
    });
    throw new UnauthorizedError('Invalid admin credentials');
  }

  logger.debug('Admin authenticated', { path: req.path });
  next();
}
