/**
 * Bulk operations for efficient multi-agent management
 */

import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../db/client';
import { z } from 'zod';
import { AgentProfileSchema } from '../middleware/validation';
import { writeLimiter } from '../middleware/rateLimit';
import { authenticateApiKey, requirePermission } from '../middleware/auth';
import { logger } from '../utils/logger';
import { triggerWebhooks } from '../services/webhooks';

const router = Router();

// Check if API key authentication is enabled
const AUTH_ENABLED = process.env.REQUIRE_API_KEY === 'true';
const conditionalAuth = AUTH_ENABLED ? [authenticateApiKey, requirePermission('write')] : [];

// Validation
const BulkRegisterSchema = z.object({
  agents: z.array(AgentProfileSchema).min(1).max(100), // Max 100 at once
});

const BulkDeleteSchema = z.object({
  agentIds: z.array(z.string()).min(1).max(100),
});

/**
 * @openapi
 * /bulk/register:
 *   post:
 *     tags:
 *       - Bulk Operations
 *     summary: Register multiple agents at once
 *     security:
 *       - ApiKeyAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - agents
 *             properties:
 *               agents:
 *                 type: array
 *                 items:
 *                   $ref: '#/components/schemas/AgentProfile'
 *                 minItems: 1
 *                 maxItems: 100
 *     responses:
 *       200:
 *         description: Bulk registration results
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: integer
 *                 failed:
 *                   type: integer
 *                 results:
 *                   type: array
 *                   items:
 *                     type: object
 */
router.post(
  '/register',
  writeLimiter,
  ...conditionalAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = BulkRegisterSchema.parse(req.body);
      const results: Array<{ id: string; status: 'success' | 'failed'; error?: string }> = [];

      let successCount = 0;
      let failedCount = 0;

      for (const agentData of data.agents) {
        try {
          // Check if already exists
          const existing = await prisma.agent.findUnique({
            where: { id: agentData.id },
          });

          if (existing) {
            results.push({
              id: agentData.id,
              status: 'failed',
              error: 'Agent already exists',
            });
            failedCount++;
            continue;
          }

          // Create agent
          const agent = await prisma.agent.create({
            data: {
              id: agentData.id,
              name: agentData.name,
              version: agentData.version,
              description: agentData.description,
              endpoints: (agentData.endpoints || {}) as any,
              pricing: (agentData.pricing || {}) as any,
              metadata: (agentData.metadata || {}) as any,
              proofOfWork: (agentData.proof_of_work || {}) as any,
              capabilities: {
                create: agentData.capabilities.map((cap) => ({
                  skill: cap.skill,
                  confidence: cap.confidence,
                  parameters: cap.parameters || {},
                })),
              },
            },
          });

          results.push({
            id: agent.id,
            status: 'success',
          });
          successCount++;

          // Trigger webhook (fire and forget)
          triggerWebhooks('agent.registered', {
            id: agent.id,
            name: agent.name,
          }).catch(() => {});
        } catch (error) {
          results.push({
            id: agentData.id,
            status: 'failed',
            error: (error as Error).message,
          });
          failedCount++;
        }
      }

      logger.info('Bulk registration completed', {
        success: successCount,
        failed: failedCount,
        total: data.agents.length,
      });

      res.json({
        success: successCount,
        failed: failedCount,
        total: data.agents.length,
        results,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @openapi
 * /bulk/delete:
 *   post:
 *     tags:
 *       - Bulk Operations
 *     summary: Delete multiple agents at once
 *     security:
 *       - ApiKeyAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - agentIds
 *             properties:
 *               agentIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                 minItems: 1
 *                 maxItems: 100
 *     responses:
 *       200:
 *         description: Bulk deletion results
 */
router.post(
  '/delete',
  writeLimiter,
  ...conditionalAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = BulkDeleteSchema.parse(req.body);
      const results: Array<{ id: string; status: 'success' | 'failed'; error?: string }> = [];

      let successCount = 0;
      let failedCount = 0;

      for (const agentId of data.agentIds) {
        try {
          await prisma.agent.delete({
            where: { id: agentId },
          });

          results.push({
            id: agentId,
            status: 'success',
          });
          successCount++;

          // Trigger webhook
          triggerWebhooks('agent.deleted', { id: agentId }).catch(() => {});
        } catch (error) {
          results.push({
            id: agentId,
            status: 'failed',
            error: (error as Error).message,
          });
          failedCount++;
        }
      }

      logger.info('Bulk deletion completed', {
        success: successCount,
        failed: failedCount,
        total: data.agentIds.length,
      });

      res.json({
        success: successCount,
        failed: failedCount,
        total: data.agentIds.length,
        results,
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
