/**
 * System metrics and statistics endpoints
 */

import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../db/client';

const router = Router();

/**
 * @openapi
 * /metrics/stats:
 *   get:
 *     tags:
 *       - Metrics
 *     summary: Get registry statistics
 *     description: Returns aggregate statistics about the registry
 *     responses:
 *       200:
 *         description: Registry statistics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 agents:
 *                   type: object
 *                   properties:
 *                     total:
 *                       type: integer
 *                     bySkill:
 *                       type: object
 *                 apiKeys:
 *                   type: object
 *                   properties:
 *                     total:
 *                       type: integer
 *                     active:
 *                       type: integer
 *                 webhooks:
 *                   type: object
 *                   properties:
 *                     total:
 *                       type: integer
 *                     active:
 *                       type: integer
 */
router.get('/stats', async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Get aggregate statistics
    const [
      totalAgents,
      totalApiKeys,
      activeApiKeys,
      totalWebhooks,
      activeWebhooks,
      capabilities,
    ] = await Promise.all([
      prisma.agent.count(),
      prisma.apiKey.count(),
      prisma.apiKey.count({ where: { isActive: true } }),
      prisma.webhook.count(),
      prisma.webhook.count({ where: { isActive: true } }),
      prisma.capability.groupBy({
        by: ['skill'],
        _count: true,
        orderBy: {
          _count: {
            skill: 'desc',
          },
        },
        take: 10,
      }),
    ]);

    // Calculate agents by skill
    const bySkill: Record<string, number> = {};
    capabilities.forEach((cap) => {
      bySkill[cap.skill] = cap._count;
    });

    res.json({
      agents: {
        total: totalAgents,
        bySkill,
      },
      apiKeys: {
        total: totalApiKeys,
        active: activeApiKeys,
      },
      webhooks: {
        total: totalWebhooks,
        active: activeWebhooks,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @openapi
 * /metrics/top-agents:
 *   get:
 *     tags:
 *       - Metrics
 *     summary: Get top performing agents
 *     description: Returns agents with best performance metrics
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of agents to return
 *     responses:
 *       200:
 *         description: Top performing agents
 */
router.get('/top-agents', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const limit = parseInt(req.query.limit as string) || 10;

    const topAgents = await prisma.agent.findMany({
      where: {
        metrics: {
          isNot: null,
        },
      },
      include: {
        metrics: true,
        capabilities: true,
      },
      orderBy: {
        metrics: {
          successRate: 'desc',
        },
      },
      take: limit,
    });

    const formatted = topAgents.map((agent) => ({
      id: agent.id,
      name: agent.name,
      version: agent.version,
      metrics: agent.metrics
        ? {
            tasks_completed: agent.metrics.tasksCompleted,
            success_rate: agent.metrics.successRate,
            avg_response_time_ms: agent.metrics.avgResponseTimeMs,
            uptime_30d: agent.metrics.uptime30d,
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
 * /metrics/prometheus:
 *   get:
 *     tags:
 *       - Metrics
 *     summary: Prometheus metrics endpoint
 *     description: Returns metrics in Prometheus text format
 *     responses:
 *       200:
 *         description: Prometheus metrics
 *         content:
 *           text/plain:
 *             schema:
 *               type: string
 */
router.get('/prometheus', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const [totalAgents, totalApiKeys, totalWebhooks, avgMetrics] = await Promise.all([
      prisma.agent.count(),
      prisma.apiKey.count({ where: { isActive: true } }),
      prisma.webhook.count({ where: { isActive: true } }),
      prisma.metrics.aggregate({
        _avg: {
          successRate: true,
          avgResponseTimeMs: true,
          uptime30d: true,
        },
        _sum: {
          tasksCompleted: true,
        },
      }),
    ]);

    // Prometheus text format
    const metrics = [
      '# HELP aip_agents_total Total number of registered agents',
      '# TYPE aip_agents_total gauge',
      `aip_agents_total ${totalAgents}`,
      '',
      '# HELP aip_api_keys_active Number of active API keys',
      '# TYPE aip_api_keys_active gauge',
      `aip_api_keys_active ${totalApiKeys}`,
      '',
      '# HELP aip_webhooks_active Number of active webhooks',
      '# TYPE aip_webhooks_active gauge',
      `aip_webhooks_active ${totalWebhooks}`,
      '',
      '# HELP aip_tasks_completed_total Total tasks completed by all agents',
      '# TYPE aip_tasks_completed_total counter',
      `aip_tasks_completed_total ${avgMetrics._sum.tasksCompleted || 0}`,
      '',
      '# HELP aip_avg_success_rate Average success rate across all agents',
      '# TYPE aip_avg_success_rate gauge',
      `aip_avg_success_rate ${avgMetrics._avg.successRate || 0}`,
      '',
      '# HELP aip_avg_response_time_ms Average response time in milliseconds',
      '# TYPE aip_avg_response_time_ms gauge',
      `aip_avg_response_time_ms ${avgMetrics._avg.avgResponseTimeMs || 0}`,
      '',
      '# HELP aip_avg_uptime_30d Average uptime over 30 days',
      '# TYPE aip_avg_uptime_30d gauge',
      `aip_avg_uptime_30d ${avgMetrics._avg.uptime30d || 0}`,
      '',
    ].join('\n');

    res.setHeader('Content-Type', 'text/plain; version=0.0.4');
    res.send(metrics);
  } catch (error) {
    next(error);
  }
});

export default router;
