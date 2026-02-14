import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../db/client';
import {
  AgentProfileSchema,
  MetricsUpdateSchema,
  SearchQuerySchema,
} from '../middleware/validation';
import { NotFoundError, ConflictError } from '../middleware/errorHandler';

const router = Router();

/**
 * POST /agents
 * Register a new agent
 */
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Validate request body
    const data = AgentProfileSchema.parse(req.body);

    // Check if agent already exists
    const existing = await prisma.agent.findUnique({
      where: { id: data.id },
    });

    if (existing) {
      throw new ConflictError('Agent with this ID already exists');
    }

    // Create agent with capabilities
    const agent = await prisma.agent.create({
      data: {
        id: data.id,
        name: data.name,
        version: data.version,
        description: data.description,
        endpoints: data.endpoints || {},
        pricing: data.pricing || {},
        metadata: data.metadata || {},
        proofOfWork: data.proof_of_work || {},
        capabilities: {
          create: data.capabilities.map((cap) => ({
            skill: cap.skill,
            confidence: cap.confidence,
            parameters: cap.parameters || {},
          })),
        },
      },
      include: {
        capabilities: true,
      },
    });

    res.status(201).json({
      id: agent.id,
      registered_at: agent.createdAt.toISOString(),
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /agents
 * Search for agents
 */
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const query = SearchQuerySchema.parse(req.query);

    const where: any = {};

    // Filter by skill
    if (query.skill) {
      where.capabilities = {
        some: {
          skill: query.skill,
          confidence: {
            gte: query.min_confidence || 0.7,
          },
        },
      };
    }

    const [agents, total] = await Promise.all([
      prisma.agent.findMany({
        where,
        include: {
          capabilities: true,
          metrics: true,
        },
        take: query.limit || 20,
        skip: query.offset || 0,
        orderBy: {
          createdAt: 'desc',
        },
      }),
      prisma.agent.count({ where }),
    ]);

    // Transform to match AIP spec
    const results = agents.map((agent) => ({
      id: agent.id,
      name: agent.name,
      version: agent.version,
      description: agent.description,
      capabilities: agent.capabilities.map((cap) => ({
        skill: cap.skill,
        confidence: cap.confidence,
        parameters: cap.parameters,
      })),
      endpoints: agent.endpoints,
      pricing: agent.pricing,
      metrics: agent.metrics
        ? {
            tasks_completed: agent.metrics.tasksCompleted,
            avg_response_time_ms: agent.metrics.avgResponseTimeMs,
            success_rate: agent.metrics.successRate,
            uptime_30d: agent.metrics.uptime30d,
            ...(agent.metrics.customMetrics as object || {}),
          }
        : undefined,
      metadata: agent.metadata,
      proof_of_work: agent.proofOfWork,
    }));

    res.json({
      results,
      total,
      page: Math.floor((query.offset || 0) / (query.limit || 20)) + 1,
      per_page: query.limit || 20,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /agents/:id
 * Get a specific agent profile
 */
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const agent = await prisma.agent.findUnique({
      where: { id: req.params.id },
      include: {
        capabilities: true,
        metrics: true,
      },
    });

    if (!agent) {
      throw new NotFoundError('Agent not found');
    }

    // Transform to match AIP spec
    const profile = {
      id: agent.id,
      name: agent.name,
      version: agent.version,
      description: agent.description,
      capabilities: agent.capabilities.map((cap) => ({
        skill: cap.skill,
        confidence: cap.confidence,
        parameters: cap.parameters,
      })),
      endpoints: agent.endpoints,
      pricing: agent.pricing,
      metrics: agent.metrics
        ? {
            tasks_completed: agent.metrics.tasksCompleted,
            avg_response_time_ms: agent.metrics.avgResponseTimeMs,
            success_rate: agent.metrics.successRate,
            uptime_30d: agent.metrics.uptime30d,
            ...(agent.metrics.customMetrics as object || {}),
          }
        : undefined,
      metadata: agent.metadata,
      proof_of_work: agent.proofOfWork,
    };

    res.json(profile);
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /agents/:id
 * Update an agent profile
 */
router.put('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = AgentProfileSchema.parse(req.body);

    // Check if agent exists
    const existing = await prisma.agent.findUnique({
      where: { id: req.params.id },
    });

    if (!existing) {
      throw new NotFoundError('Agent not found');
    }

    // Update agent
    const agent = await prisma.agent.update({
      where: { id: req.params.id },
      data: {
        name: data.name,
        version: data.version,
        description: data.description,
        endpoints: data.endpoints || {},
        pricing: data.pricing || {},
        metadata: data.metadata || {},
        proofOfWork: data.proof_of_work || {},
        capabilities: {
          deleteMany: {},
          create: data.capabilities.map((cap) => ({
            skill: cap.skill,
            confidence: cap.confidence,
            parameters: cap.parameters || {},
          })),
        },
      },
    });

    res.json({
      updated_at: agent.updatedAt.toISOString(),
    });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /agents/:id
 * Delete an agent
 */
router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const existing = await prisma.agent.findUnique({
      where: { id: req.params.id },
    });

    if (!existing) {
      throw new NotFoundError('Agent not found');
    }

    await prisma.agent.delete({
      where: { id: req.params.id },
    });

    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

/**
 * POST /agents/:id/metrics
 * Report metrics for an agent
 */
router.post('/:id/metrics', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = MetricsUpdateSchema.parse(req.body);

    // Check if agent exists
    const existing = await prisma.agent.findUnique({
      where: { id: req.params.id },
    });

    if (!existing) {
      throw new NotFoundError('Agent not found');
    }

    // Upsert metrics
    const metrics = await prisma.metrics.upsert({
      where: { agentId: req.params.id },
      create: {
        agentId: req.params.id,
        tasksCompleted: data.tasks_completed,
        avgResponseTimeMs: data.avg_response_time_ms,
        successRate: data.success_rate,
        uptime30d: data.uptime_30d,
        customMetrics: {},
      },
      update: {
        tasksCompleted: data.tasks_completed,
        avgResponseTimeMs: data.avg_response_time_ms,
        successRate: data.success_rate,
        uptime30d: data.uptime_30d,
      },
    });

    res.json({
      recorded_at: metrics.updatedAt.toISOString(),
    });
  } catch (error) {
    next(error);
  }
});

export default router;
