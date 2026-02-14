/**
 * Agent Identity Protocol (AIP) - TypeScript SDK
 * @version 0.1.0
 */

export * from './types';

import {
  AgentProfile,
  AgentId,
  Capability,
  Metrics,
  SearchResponse,
  RegistrationResponse,
  UpdateResponse,
  MetricsReportResponse,
  ErrorResponse,
} from './types';

/**
 * AIP Client for interacting with agent registries
 */
export class AIPClient {
  private registryUrl: string;
  private apiKey?: string;

  /**
   * Create a new AIP client
   * @param registryUrl - Base URL of the registry (e.g., "https://registry.aip.dev")
   * @param apiKey - Optional API key for authentication
   */
  constructor(registryUrl: string, apiKey?: string) {
    this.registryUrl = registryUrl.replace(/\/$/, ''); // Remove trailing slash
    this.apiKey = apiKey;
  }

  /**
   * Register a new agent in the registry
   * @param profile - Complete agent profile
   * @returns Registration response with ID and timestamp
   */
  async register(profile: AgentProfile): Promise<RegistrationResponse> {
    const response = await this.fetch('/agents', {
      method: 'POST',
      body: JSON.stringify(profile),
    });

    if (!response.ok) {
      throw await this.handleError(response);
    }

    return response.json();
  }

  /**
   * Get an agent profile by ID
   * @param agentId - Unique agent identifier
   * @returns Full agent profile
   */
  async getAgent(agentId: AgentId): Promise<AgentProfile> {
    const response = await this.fetch(`/agents/${encodeURIComponent(agentId)}`);

    if (!response.ok) {
      throw await this.handleError(response);
    }

    return response.json();
  }

  /**
   * Search for agents by skill
   * @param skill - Skill identifier (e.g., "text-generation")
   * @param minConfidence - Minimum confidence level (0.0 - 1.0), default 0.7
   * @param limit - Maximum number of results, default 20
   * @returns Search results with matching agents
   */
  async search(
    skill: string,
    minConfidence: number = 0.7,
    limit: number = 20
  ): Promise<AgentProfile[]> {
    const params = new URLSearchParams({
      skill,
      min_confidence: minConfidence.toString(),
      limit: limit.toString(),
    });

    const response = await this.fetch(`/agents?${params.toString()}`);

    if (!response.ok) {
      throw await this.handleError(response);
    }

    const data: SearchResponse = await response.json();
    return data.results;
  }

  /**
   * Update an existing agent profile
   * @param agentId - Unique agent identifier
   * @param profile - Updated profile data
   * @returns Update response with timestamp
   */
  async update(agentId: AgentId, profile: AgentProfile): Promise<UpdateResponse> {
    const response = await this.fetch(`/agents/${encodeURIComponent(agentId)}`, {
      method: 'PUT',
      body: JSON.stringify(profile),
    });

    if (!response.ok) {
      throw await this.handleError(response);
    }

    return response.json();
  }

  /**
   * Delete an agent from the registry
   * @param agentId - Unique agent identifier
   */
  async delete(agentId: AgentId): Promise<void> {
    const response = await this.fetch(`/agents/${encodeURIComponent(agentId)}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      throw await this.handleError(response);
    }
  }

  /**
   * Report performance metrics for an agent
   * @param agentId - Unique agent identifier
   * @param metrics - Performance metrics to report
   * @returns Metrics report response with timestamp
   */
  async reportMetrics(
    agentId: AgentId,
    metrics: Metrics
  ): Promise<MetricsReportResponse> {
    const response = await this.fetch(
      `/agents/${encodeURIComponent(agentId)}/metrics`,
      {
        method: 'POST',
        body: JSON.stringify(metrics),
      }
    );

    if (!response.ok) {
      throw await this.handleError(response);
    }

    return response.json();
  }

  /**
   * Internal fetch wrapper with authentication
   */
  private async fetch(path: string, options: RequestInit = {}): Promise<Response> {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (this.apiKey) {
      headers['Authorization'] = `Bearer ${this.apiKey}`;
    }

    return fetch(`${this.registryUrl}${path}`, {
      ...options,
      headers,
    });
  }

  /**
   * Handle error responses
   */
  private async handleError(response: Response): Promise<Error> {
    let errorData: ErrorResponse;
    try {
      errorData = await response.json();
    } catch {
      errorData = { error: `HTTP ${response.status}: ${response.statusText}` };
    }

    return new Error(errorData.error || 'Unknown error');
  }
}

/**
 * Helper function to create an agent profile with minimal required fields
 * @param config - Basic configuration (id, name, capabilities)
 * @returns Complete agent profile with defaults
 */
export function createAgent(config: {
  id: AgentId;
  name: string;
  capabilities: Capability[];
  version?: string;
  description?: string;
  endpoints?: AgentProfile['endpoints'];
  pricing?: AgentProfile['pricing'];
  metadata?: Record<string, any>;
}): AgentProfile {
  return {
    id: config.id,
    name: config.name,
    version: config.version || '1.0.0',
    capabilities: config.capabilities,
    description: config.description,
    endpoints: config.endpoints || {},
    pricing: config.pricing || { model: 'free' },
    metrics: {},
    metadata: config.metadata || {},
  };
}

/**
 * Helper function to create a capability
 * @param skill - Skill identifier
 * @param confidence - Confidence level (default 0.9)
 * @param parameters - Optional capability parameters
 * @returns Capability object
 */
export function createCapability(
  skill: string,
  confidence: number = 0.9,
  parameters?: Capability['parameters']
): Capability {
  return {
    skill,
    confidence,
    parameters,
  };
}
