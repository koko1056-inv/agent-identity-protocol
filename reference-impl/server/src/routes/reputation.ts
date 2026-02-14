/**
 * Reputation and review management routes
 */

import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../db/client';
import { z } from 'zod';
import { NotFoundError } from '../middleware/errorHandler';
import { writeLimiter, searchLimiter } from '../middleware/rateLimit';
import { calculateReputationScore, getTopAgentsByReputation } from '../services/reputation';

const router = Router();

// Validation schemas
const CreateReviewSchema = z.object({
  rating: z.enum(['POSITIVE', 'NEUTRAL', 'NEGATIVE']),
  comment: z.string().max(1000).optional(),
  reviewerId: z.string().optional(),
  metadata: z.record(z.any()).optional(),
});

/**
 * @openapi
 * /reputation/agents/{id}/reviews:
 *   post:
 *     tags:
 *       - Reputation
 *     summary: Submit a review for an agent
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - rating
 *             properties:
 *               rating:
 *                 type: string
 *                 enum: [POSITIVE, NEUTRAL, NEGATIVE]
 *               comment:
 *                 type: string
 *                 maxLength: 1000
 *               reviewerId:
 *                 type: string
 *               metadata:
 *                 type: object
 *     responses:
 *       201:
 *         description: Review submitted successfully
 *       404:
 *         description: Agent not found
 */
router.post(
  '/agents/:id/reviews',
  writeLimiter,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = CreateReviewSchema.parse(req.body);
      const agentId = req.params.id;

      // Check if agent exists
      const agent = await prisma.agent.findUnique({
        where: { id: agentId },
      });

      if (!agent) {
        throw new NotFoundError('Agent not found');
      }

      // Create review
      const review = await prisma.review.create({
        data: {
          agentId,
          rating: data.rating,
          comment: data.comment,
          reviewerId: data.reviewerId,
          metadata: (data.metadata || {}) as any,
        },
      });

      // Trigger reputation score recalculation (async)
      calculateReputationScore(agentId).catch((err) =>
        console.error('Failed to recalculate reputation:', err)
      );

      res.status(201).json({
        id: review.id,
        rating: review.rating,
        createdAt: review.createdAt.toISOString(),
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @openapi
 * /reputation/agents/{id}/reviews:
 *   get:
 *     tags:
 *       - Reputation
 *     summary: Get reviews for an agent
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *     responses:
 *       200:
 *         description: List of reviews
 */
router.get(
  '/agents/:id/reviews',
  searchLimiter,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const agentId = req.params.id;
      const limit = parseInt(req.query.limit as string) || 20;

      const reviews = await prisma.review.findMany({
        where: { agentId },
        orderBy: { createdAt: 'desc' },
        take: limit,
      });

      res.json({
        reviews: reviews.map((r) => ({
          id: r.id,
          rating: r.rating,
          comment: r.comment,
          reviewerId: r.reviewerId,
          createdAt: r.createdAt.toISOString(),
        })),
        total: reviews.length,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @openapi
 * /reputation/agents/{id}/score:
 *   get:
 *     tags:
 *       - Reputation
 *     summary: Get reputation score for an agent
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Reputation score
 *       404:
 *         description: Agent or score not found
 */
router.get(
  '/agents/:id/score',
  searchLimiter,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const agentId = req.params.id;

      const score = await prisma.reputationScore.findUnique({
        where: { agentId },
      });

      if (!score) {
        // Calculate if not exists
        await calculateReputationScore(agentId);
        const newScore = await prisma.reputationScore.findUnique({
          where: { agentId },
        });

        if (!newScore) {
          throw new NotFoundError('Agent not found');
        }

        return res.json({
          overallScore: newScore.overallScore,
          performanceScore: newScore.performanceScore,
          reliabilityScore: newScore.reliabilityScore,
          communityScore: newScore.communityScore,
          totalReviews: newScore.totalReviews,
          breakdown: {
            positive: newScore.positiveReviews,
            neutral: newScore.neutralReviews,
            negative: newScore.negativeReviews,
          },
          lastCalculatedAt: newScore.lastCalculatedAt.toISOString(),
        });
      }

      res.json({
        overallScore: score.overallScore,
        performanceScore: score.performanceScore,
        reliabilityScore: score.reliabilityScore,
        communityScore: score.communityScore,
        totalReviews: score.totalReviews,
        breakdown: {
          positive: score.positiveReviews,
          neutral: score.neutralReviews,
          negative: score.negativeReviews,
        },
        lastCalculatedAt: score.lastCalculatedAt.toISOString(),
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @openapi
 * /reputation/top-agents:
 *   get:
 *     tags:
 *       - Reputation
 *     summary: Get top-rated agents by reputation score
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *     responses:
 *       200:
 *         description: Top-rated agents
 */
router.get('/top-agents', searchLimiter, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const limit = parseInt(req.query.limit as string) || 10;

    const topAgents = await getTopAgentsByReputation(limit);

    const formatted = topAgents.map((agent) => ({
      id: agent.id,
      name: agent.name,
      version: agent.version,
      reputationScore: agent.reputationScore
        ? {
            overall: agent.reputationScore.overallScore,
            performance: agent.reputationScore.performanceScore,
            reliability: agent.reputationScore.reliabilityScore,
            community: agent.reputationScore.communityScore,
            totalReviews: agent.reputationScore.totalReviews,
          }
        : null,
      skills: agent.capabilities.map((c) => c.skill),
    }));

    res.json({
      agents: formatted,
      limit,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @openapi
 * /reputation/agents/{id}/recalculate:
 *   post:
 *     tags:
 *       - Reputation
 *     summary: Manually trigger reputation score recalculation
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Score recalculated
 *       404:
 *         description: Agent not found
 */
router.post(
  '/agents/:id/recalculate',
  writeLimiter,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const agentId = req.params.id;

      const agent = await prisma.agent.findUnique({
        where: { id: agentId },
      });

      if (!agent) {
        throw new NotFoundError('Agent not found');
      }

      await calculateReputationScore(agentId);

      const score = await prisma.reputationScore.findUnique({
        where: { agentId },
      });

      res.json({
        message: 'Reputation score recalculated',
        score: score
          ? {
              overall: score.overallScore,
              performance: score.performanceScore,
              reliability: score.reliabilityScore,
              community: score.communityScore,
            }
          : null,
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
