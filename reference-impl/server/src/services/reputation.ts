/**
 * Reputation scoring service
 * Calculates and updates agent reputation scores based on multiple factors
 */

import { prisma } from '../db/client';
import { logger } from '../utils/logger';

/**
 * Calculate reputation score for an agent
 * 
 * Scoring formula:
 * - Performance Score (40%): Based on metrics (success rate, response time, uptime)
 * - Reliability Score (30%): Based on historical consistency
 * - Community Score (30%): Based on reviews and feedback
 * 
 * Overall Score = weighted average of the above
 */
export async function calculateReputationScore(agentId: string): Promise<void> {
  try {
    const agent = await prisma.agent.findUnique({
      where: { id: agentId },
      include: {
        metrics: true,
        reviews: true,
        reputationScore: true,
      },
    });

    if (!agent) {
      logger.warn('Agent not found for reputation calculation', { agentId });
      return;
    }

    // 1. Calculate Performance Score (based on metrics)
    let performanceScore = 0.5; // Default neutral score
    if (agent.metrics) {
      const successRate = agent.metrics.successRate || 0;
      const uptime = agent.metrics.uptime30d || 0;
      const responseTime = agent.metrics.avgResponseTimeMs || 1000;

      // Success rate contributes 50%
      const successComponent = successRate * 0.5;

      // Uptime contributes 30%
      const uptimeComponent = uptime * 0.3;

      // Response time contributes 20% (inverse - faster is better)
      // Normalize response time: 0-500ms = 1.0, 500-2000ms = 0.5-1.0, >2000ms = 0-0.5
      let responseComponent = 0;
      if (responseTime <= 500) {
        responseComponent = 0.2;
      } else if (responseTime <= 2000) {
        responseComponent = 0.2 * (1 - (responseTime - 500) / 1500);
      } else {
        responseComponent = 0.2 * Math.max(0, 1 - (responseTime - 2000) / 3000);
      }

      performanceScore = Math.min(1.0, successComponent + uptimeComponent + responseComponent);
    }

    // 2. Calculate Reliability Score (based on consistency over time)
    // For now, use uptime as a proxy
    const reliabilityScore = agent.metrics?.uptime30d || 0.5;

    // 3. Calculate Community Score (based on reviews)
    let communityScore = 0.5; // Default neutral score
    const totalReviews = agent.reviews.length;
    const positiveReviews = agent.reviews.filter((r) => r.rating === 'POSITIVE').length;
    const neutralReviews = agent.reviews.filter((r) => r.rating === 'NEUTRAL').length;
    const negativeReviews = agent.reviews.filter((r) => r.rating === 'NEGATIVE').length;

    if (totalReviews > 0) {
      // Weight: POSITIVE = +1, NEUTRAL = 0, NEGATIVE = -1
      const reviewScore = (positiveReviews - negativeReviews) / totalReviews;
      // Normalize to 0-1 range
      communityScore = Math.max(0, Math.min(1, (reviewScore + 1) / 2));

      // Apply confidence factor based on number of reviews
      // Less than 5 reviews: reduce confidence
      if (totalReviews < 5) {
        const confidenceFactor = totalReviews / 5;
        communityScore = 0.5 + (communityScore - 0.5) * confidenceFactor;
      }
    }

    // 4. Calculate Overall Score (weighted average)
    const overallScore =
      performanceScore * 0.4 + reliabilityScore * 0.3 + communityScore * 0.3;

    // 5. Upsert reputation score
    await prisma.reputationScore.upsert({
      where: { agentId },
      create: {
        agentId,
        overallScore,
        performanceScore,
        reliabilityScore,
        communityScore,
        totalReviews,
        positiveReviews,
        neutralReviews,
        negativeReviews,
        lastCalculatedAt: new Date(),
      },
      update: {
        overallScore,
        performanceScore,
        reliabilityScore,
        communityScore,
        totalReviews,
        positiveReviews,
        neutralReviews,
        negativeReviews,
        lastCalculatedAt: new Date(),
      },
    });

    logger.info('Reputation score calculated', {
      agentId,
      overallScore: overallScore.toFixed(3),
      performanceScore: performanceScore.toFixed(3),
      reliabilityScore: reliabilityScore.toFixed(3),
      communityScore: communityScore.toFixed(3),
    });
  } catch (error: any) {
    logger.error('Failed to calculate reputation score', {
      agentId,
      error: error.message,
    });
  }
}

/**
 * Recalculate reputation scores for all agents
 * Should be run periodically (e.g., daily via cron)
 */
export async function recalculateAllReputationScores(): Promise<{
  success: number;
  failed: number;
}> {
  logger.info('Starting reputation score recalculation for all agents');

  const agents = await prisma.agent.findMany({
    select: { id: true },
  });

  let success = 0;
  let failed = 0;

  for (const agent of agents) {
    try {
      await calculateReputationScore(agent.id);
      success++;
    } catch (error) {
      failed++;
    }
  }

  logger.info('Reputation score recalculation completed', {
    total: agents.length,
    success,
    failed,
  });

  return { success, failed };
}

/**
 * Get agents ranked by reputation
 */
export async function getTopAgentsByReputation(limit: number = 10) {
  return prisma.agent.findMany({
    where: {
      reputationScore: {
        isNot: null,
      },
    },
    include: {
      reputationScore: true,
      capabilities: true,
      metrics: true,
    },
    orderBy: {
      reputationScore: {
        overallScore: 'desc',
      },
    },
    take: limit,
  });
}
