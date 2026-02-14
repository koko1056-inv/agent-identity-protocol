/**
 * API Key authentication middleware
 */

import { Request, Response, NextFunction } from 'express';
import { prisma } from '../db/client';
import { UnauthorizedError, ForbiddenError } from './errorHandler';
import { logger } from '../utils/logger';

interface AuthenticatedRequest extends Request {
  apiKey?: {
    id: string;
    name: string;
    permissions: {
      read: boolean;
      write: boolean;
      delete: boolean;
    };
  };
}

/**
 * Extract API key from request headers
 */
function extractApiKey(req: Request): string | null {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return null;
  }

  // Support both "Bearer <key>" and "ApiKey <key>"
  const match = authHeader.match(/^(Bearer|ApiKey)\s+(.+)$/i);
  return match ? match[2] : null;
}

/**
 * Authenticate request with API key
 */
export async function authenticateApiKey(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const keyValue = extractApiKey(req);

    if (!keyValue) {
      throw new UnauthorizedError('API key required. Provide via Authorization header: "Bearer <key>"');
    }

    // Look up API key
    const apiKey = await prisma.apiKey.findUnique({
      where: { key: keyValue },
    });

    if (!apiKey) {
      logger.warn('Invalid API key attempt', { key: keyValue.substring(0, 8) + '...' });
      throw new UnauthorizedError('Invalid API key');
    }

    // Check if active
    if (!apiKey.isActive) {
      throw new UnauthorizedError('API key is disabled');
    }

    // Check expiration
    if (apiKey.expiresAt && new Date() > apiKey.expiresAt) {
      throw new UnauthorizedError('API key has expired');
    }

    // Update last used timestamp (fire and forget)
    prisma.apiKey
      .update({
        where: { id: apiKey.id },
        data: { lastUsedAt: new Date() },
      })
      .catch((err) => logger.error('Failed to update API key last used', { error: err.message }));

    // Attach API key info to request
    req.apiKey = {
      id: apiKey.id,
      name: apiKey.name,
      permissions: apiKey.permissions as any,
    };

    logger.debug('API key authenticated', { keyName: apiKey.name });
    next();
  } catch (error) {
    next(error);
  }
}

/**
 * Require specific permission
 */
export function requirePermission(permission: 'read' | 'write' | 'delete') {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.apiKey) {
      return next(new UnauthorizedError('Authentication required'));
    }

    if (!req.apiKey.permissions[permission]) {
      logger.warn('Permission denied', {
        keyName: req.apiKey.name,
        requiredPermission: permission,
      });
      return next(new ForbiddenError(`This API key does not have '${permission}' permission`));
    }

    next();
  };
}

/**
 * Optional authentication (doesn't fail if no key provided)
 */
export async function optionalAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const keyValue = extractApiKey(req);

  if (!keyValue) {
    // No key provided, continue without authentication
    return next();
  }

  // If key is provided, validate it
  return authenticateApiKey(req, res, next);
}

// Export extended Request type
export type { AuthenticatedRequest };
