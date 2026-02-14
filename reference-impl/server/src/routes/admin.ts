/**
 * Admin API routes for API key management
 * Protected by admin authentication
 */

import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../db/client';
import { z } from 'zod';
import { NotFoundError } from '../middleware/errorHandler';
import { writeLimiter } from '../middleware/rateLimit';
import { requireAdmin } from '../middleware/adminAuth';
import crypto from 'crypto';

const router = Router();

// Apply admin authentication to all routes
router.use(requireAdmin);

/**
 * Hash API key for secure storage
 */
function hashApiKey(key: string): string {
  return crypto.createHash('sha256').update(key).digest('hex');
}

// Validation schemas
const CreateApiKeySchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  permissions: z
    .object({
      read: z.boolean().default(true),
      write: z.boolean().default(false),
      delete: z.boolean().default(false),
    })
    .optional(),
  rateLimit: z.number().int().positive().max(10000).optional(),
  expiresAt: z.string().datetime().optional(),
});

const UpdateApiKeySchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  permissions: z
    .object({
      read: z.boolean(),
      write: z.boolean(),
      delete: z.boolean(),
    })
    .optional(),
  rateLimit: z.number().int().positive().max(10000).optional(),
  isActive: z.boolean().optional(),
  expiresAt: z.string().datetime().optional(),
});

/**
 * Generate a secure random API key
 */
function generateApiKey(): string {
  const prefix = 'aip';
  const random = crypto.randomBytes(32).toString('base64url');
  return `${prefix}_${random}`;
}

/**
 * POST /admin/api-keys
 * Create a new API key
 */
router.post('/api-keys', writeLimiter, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = CreateApiKeySchema.parse(req.body);

    const key = generateApiKey();
    const hashedKey = hashApiKey(key);

    const apiKey = await prisma.apiKey.create({
      data: {
        key: hashedKey, // Store hashed key
        name: data.name,
        description: data.description,
        permissions: (data.permissions || {
          read: true,
          write: false,
          delete: false,
        }) as any,
        rateLimit: data.rateLimit,
        expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
      },
    });

    res.status(201).json({
      id: apiKey.id,
      key, // Return plain key ONLY on creation!
      name: apiKey.name,
      description: apiKey.description,
      permissions: apiKey.permissions,
      rateLimit: apiKey.rateLimit,
      expiresAt: apiKey.expiresAt?.toISOString(),
      createdAt: apiKey.createdAt.toISOString(),
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /admin/api-keys
 * List all API keys (without revealing the actual keys)
 */
router.get('/api-keys', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const apiKeys = await prisma.apiKey.findMany({
      orderBy: { createdAt: 'desc' },
    });

    const sanitized = apiKeys.map((key) => ({
      id: key.id,
      name: key.name,
      description: key.description,
      permissions: key.permissions,
      rateLimit: key.rateLimit,
      isActive: key.isActive,
      lastUsedAt: key.lastUsedAt?.toISOString(),
      createdAt: key.createdAt.toISOString(),
      expiresAt: key.expiresAt?.toISOString(),
      // Key is masked
      keyPreview: key.key.substring(0, 12) + '...',
    }));

    res.json({ apiKeys: sanitized, total: sanitized.length });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /admin/api-keys/:id
 * Get a specific API key (without revealing the actual key)
 */
router.get('/admin/api-keys/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const apiKey = await prisma.apiKey.findUnique({
      where: { id: req.params.id },
    });

    if (!apiKey) {
      throw new NotFoundError('API key not found');
    }

    res.json({
      id: apiKey.id,
      name: apiKey.name,
      description: apiKey.description,
      permissions: apiKey.permissions,
      rateLimit: apiKey.rateLimit,
      isActive: apiKey.isActive,
      lastUsedAt: apiKey.lastUsedAt?.toISOString(),
      createdAt: apiKey.createdAt.toISOString(),
      expiresAt: apiKey.expiresAt?.toISOString(),
      keyPreview: apiKey.key.substring(0, 12) + '...',
    });
  } catch (error) {
    next(error);
  }
});

/**
 * PATCH /admin/api-keys/:id
 * Update an API key
 */
router.patch('/api-keys/:id', writeLimiter, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = UpdateApiKeySchema.parse(req.body);

    const existing = await prisma.apiKey.findUnique({
      where: { id: req.params.id },
    });

    if (!existing) {
      throw new NotFoundError('API key not found');
    }

    const updated = await prisma.apiKey.update({
      where: { id: req.params.id },
      data: {
        name: data.name,
        description: data.description,
        permissions: data.permissions as any,
        rateLimit: data.rateLimit,
        isActive: data.isActive,
        expiresAt: data.expiresAt ? new Date(data.expiresAt) : undefined,
      },
    });

    res.json({
      id: updated.id,
      name: updated.name,
      description: updated.description,
      permissions: updated.permissions,
      rateLimit: updated.rateLimit,
      isActive: updated.isActive,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /admin/api-keys/:id
 * Delete an API key
 */
router.delete('/api-keys/:id', writeLimiter, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const existing = await prisma.apiKey.findUnique({
      where: { id: req.params.id },
    });

    if (!existing) {
      throw new NotFoundError('API key not found');
    }

    await prisma.apiKey.delete({
      where: { id: req.params.id },
    });

    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

/**
 * POST /admin/api-keys/:id/revoke
 * Revoke (disable) an API key
 */
router.post('/api-keys/:id/revoke', writeLimiter, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const existing = await prisma.apiKey.findUnique({
      where: { id: req.params.id },
    });

    if (!existing) {
      throw new NotFoundError('API key not found');
    }

    await prisma.apiKey.update({
      where: { id: req.params.id },
      data: { isActive: false },
    });

    res.json({
      message: 'API key revoked successfully',
      revokedAt: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
});

export default router;
