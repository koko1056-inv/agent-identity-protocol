/**
 * Federation service for multi-registry synchronization
 */

import { prisma } from '../db/client';
import { logger } from '../utils/logger';

/**
 * Sync agents from a federated registry
 */
export async function syncFromRegistry(registryId: string): Promise<{
  synced: number;
  failed: number;
}> {
  const registry = await prisma.federatedRegistry.findUnique({
    where: { id: registryId },
  });

  if (!registry || !registry.isActive || !registry.syncEnabled) {
    throw new Error('Registry not found or sync disabled');
  }

  logger.info('Starting federation sync', {
    registryId,
    registryUrl: registry.url,
  });

  let synced = 0;
  let failed = 0;

  try {
    // Fetch agents from remote registry
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (registry.apiKey) {
      headers['Authorization'] = `Bearer ${registry.apiKey}`;
    }

    const response = await fetch(`${registry.url}/agents`, {
      headers,
      signal: AbortSignal.timeout(30000),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = (await response.json()) as any;
    const agents = data.results || [];

    // Upsert federated agents
    for (const agent of agents) {
      try {
        await prisma.federatedAgent.upsert({
          where: {
            agentId_sourceRegistryId: {
              agentId: agent.id,
              sourceRegistryId: registryId,
            },
          },
          create: {
            agentId: agent.id,
            sourceRegistryId: registryId,
            sourceUrl: `${registry.url}/agents/${agent.id}`,
            agentData: agent as any,
            isVerified: registry.isTrusted,
            lastSyncedAt: new Date(),
          },
          update: {
            agentData: agent as any,
            lastSyncedAt: new Date(),
          },
        });

        synced++;
      } catch (error) {
        failed++;
        logger.error('Failed to sync agent', {
          agentId: agent.id,
          error: (error as Error).message,
        });
      }
    }

    // Update last sync time
    await prisma.federatedRegistry.update({
      where: { id: registryId },
      data: { lastSyncAt: new Date() },
    });

    logger.info('Federation sync completed', {
      registryId,
      synced,
      failed,
    });

    return { synced, failed };
  } catch (error: any) {
    logger.error('Federation sync failed', {
      registryId,
      error: error.message,
    });
    throw error;
  }
}

/**
 * Sync from all active federated registries
 */
export async function syncAllRegistries(): Promise<Record<string, { synced: number; failed: number }>> {
  const registries = await prisma.federatedRegistry.findMany({
    where: {
      isActive: true,
      syncEnabled: true,
    },
  });

  const results: Record<string, { synced: number; failed: number }> = {};

  for (const registry of registries) {
    try {
      const result = await syncFromRegistry(registry.id);
      results[registry.id] = result;
    } catch (error) {
      results[registry.id] = { synced: 0, failed: -1 };
    }
  }

  return results;
}

/**
 * Search across federated agents
 */
export async function searchFederated(skill: string, minConfidence: number = 0.7) {
  const federatedAgents = await prisma.federatedAgent.findMany({
    where: {
      isVerified: true,
    },
    include: {
      sourceRegistry: true,
    },
  });

  // Filter by skill in agent data
  return federatedAgents.filter((fa: any) => {
    const agentData = fa.agentData as any;
    if (!agentData.capabilities) return false;

    return agentData.capabilities.some(
      (cap: any) => cap.skill === skill && cap.confidence >= minConfidence
    );
  });
}
