/**
 * WebHook management API routes
 */

import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../db/client';
import { z } from 'zod';
import { NotFoundError } from '../middleware/errorHandler';
import { writeLimiter } from '../middleware/rateLimit';
import { requireAdmin } from '../middleware/adminAuth';

const router = Router();

// Apply admin authentication to all routes
router.use(requireAdmin);

// Validation schemas
const CreateWebhookSchema = z.object({
  url: z.string().url('URL must be a valid HTTP/HTTPS URL'),
  events: z
    .array(
      z.enum([
        'agent.registered',
        'agent.updated',
        'agent.deleted',
        'agent.metrics_reported',
      ])
    )
    .min(1, 'At least one event is required')
    .optional(),
  secret: z.string().min(16, 'Secret must be at least 16 characters').optional(),
});

const UpdateWebhookSchema = z.object({
  url: z.string().url().optional(),
  events: z
    .array(
      z.enum([
        'agent.registered',
        'agent.updated',
        'agent.deleted',
        'agent.metrics_reported',
      ])
    )
    .min(1)
    .optional(),
  secret: z.string().min(16).optional(),
  isActive: z.boolean().optional(),
});

/**
 * @openapi
 * /admin/webhooks:
 *   post:
 *     tags:
 *       - Admin
 *     summary: Create a new webhook
 *     security:
 *       - AdminKeyAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - url
 *             properties:
 *               url:
 *                 type: string
 *                 format: uri
 *                 example: https://your-app.com/webhook
 *               events:
 *                 type: array
 *                 items:
 *                   type: string
 *                   enum: [agent.registered, agent.updated, agent.deleted, agent.metrics_reported]
 *                 example: ["agent.registered", "agent.updated"]
 *               secret:
 *                 type: string
 *                 minLength: 16
 *                 description: Optional secret for HMAC signature verification
 *     responses:
 *       201:
 *         description: Webhook created successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 */
router.post('/', writeLimiter, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = CreateWebhookSchema.parse(req.body);

    const webhook = await prisma.webhook.create({
      data: {
        url: data.url,
        events: data.events || [
          'agent.registered',
          'agent.updated',
          'agent.deleted',
          'agent.metrics_reported',
        ],
        secret: data.secret,
      },
    });

    res.status(201).json({
      id: webhook.id,
      url: webhook.url,
      events: webhook.events,
      isActive: webhook.isActive,
      createdAt: webhook.createdAt.toISOString(),
      // Don't return the secret
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @openapi
 * /admin/webhooks:
 *   get:
 *     tags:
 *       - Admin
 *     summary: List all webhooks
 *     security:
 *       - AdminKeyAuth: []
 *     responses:
 *       200:
 *         description: List of webhooks
 */
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const webhooks = await prisma.webhook.findMany({
      orderBy: { createdAt: 'desc' },
    });

    const sanitized = webhooks.map((w) => ({
      id: w.id,
      url: w.url,
      events: w.events,
      isActive: w.isActive,
      lastTriggeredAt: w.lastTriggeredAt?.toISOString(),
      createdAt: w.createdAt.toISOString(),
      hasSecret: !!w.secret,
    }));

    res.json({ webhooks: sanitized, total: sanitized.length });
  } catch (error) {
    next(error);
  }
});

/**
 * @openapi
 * /admin/webhooks/{id}:
 *   get:
 *     tags:
 *       - Admin
 *     summary: Get a specific webhook
 *     security:
 *       - AdminKeyAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Webhook details
 *       404:
 *         description: Webhook not found
 */
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const webhook = await prisma.webhook.findUnique({
      where: { id: req.params.id },
    });

    if (!webhook) {
      throw new NotFoundError('Webhook not found');
    }

    res.json({
      id: webhook.id,
      url: webhook.url,
      events: webhook.events,
      isActive: webhook.isActive,
      lastTriggeredAt: webhook.lastTriggeredAt?.toISOString(),
      createdAt: webhook.createdAt.toISOString(),
      hasSecret: !!webhook.secret,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @openapi
 * /admin/webhooks/{id}:
 *   patch:
 *     tags:
 *       - Admin
 *     summary: Update a webhook
 *     security:
 *       - AdminKeyAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               url:
 *                 type: string
 *                 format: uri
 *               events:
 *                 type: array
 *                 items:
 *                   type: string
 *               secret:
 *                 type: string
 *               isActive:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Webhook updated
 *       404:
 *         description: Webhook not found
 */
router.patch('/:id', writeLimiter, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = UpdateWebhookSchema.parse(req.body);

    const existing = await prisma.webhook.findUnique({
      where: { id: req.params.id },
    });

    if (!existing) {
      throw new NotFoundError('Webhook not found');
    }

    const updated = await prisma.webhook.update({
      where: { id: req.params.id },
      data: {
        url: data.url,
        events: data.events,
        secret: data.secret,
        isActive: data.isActive,
      },
    });

    res.json({
      id: updated.id,
      url: updated.url,
      events: updated.events,
      isActive: updated.isActive,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @openapi
 * /admin/webhooks/{id}:
 *   delete:
 *     tags:
 *       - Admin
 *     summary: Delete a webhook
 *     security:
 *       - AdminKeyAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       204:
 *         description: Webhook deleted
 *       404:
 *         description: Webhook not found
 */
router.delete('/:id', writeLimiter, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const existing = await prisma.webhook.findUnique({
      where: { id: req.params.id },
    });

    if (!existing) {
      throw new NotFoundError('Webhook not found');
    }

    await prisma.webhook.delete({
      where: { id: req.params.id },
    });

    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

/**
 * @openapi
 * /admin/webhooks/{id}/test:
 *   post:
 *     tags:
 *       - Admin
 *     summary: Test a webhook (sends a test event)
 *     security:
 *       - AdminKeyAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Test webhook sent
 *       404:
 *         description: Webhook not found
 */
router.post('/:id/test', writeLimiter, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const webhook = await prisma.webhook.findUnique({
      where: { id: req.params.id },
    });

    if (!webhook) {
      throw new NotFoundError('Webhook not found');
    }

    // Import webhook service
    const { triggerWebhooks } = await import('../services/webhooks');

    // Send test webhook
    await triggerWebhooks('agent.registered', {
      test: true,
      message: 'This is a test webhook from AIP Registry',
    });

    res.json({
      message: 'Test webhook sent',
      url: webhook.url,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
