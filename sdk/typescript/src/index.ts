/**
 * Agent Identity Protocol (AIP) - TypeScript SDK
 * @version 0.3.0
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

export interface AIPClientOptions {
  /** Base URL of the registry */
  registryUrl: string;
  /** Optional API key for authentication */
  apiKey?: string;
  /** Request timeout in milliseconds (default: 30000) */
  timeout?: number;
  /** Maximum number of retries for failed requests (default: 3) */
  maxRetries?: number;
  /** Exponential backoff factor (default: 0.5) */
  backoffFactor?: number;
}

/**
 * AIP Client for interacting with agent registries
 */
export class AIPClient {
  private registryUrl: string;
  private apiKey?: string;
  private timeout: number;
  private maxRetries: number;
  private backoffFactor: number;

  /**
   * Create a new AIP client
   * @param options - Client configuration options
   */
  constructor(options: string | AIPClientOptions, apiKey?: string) {
    if (typeof options === 'string') {
      // Backwards compatibility: AIPClient(url, apiKey)
      this.registryUrl = options.replace(/\/$/, '');
      this.apiKey = apiKey || process.env.AIP_API_KEY;
      this.timeout = 30000;
      this.maxRetries = 3;
      this.backoffFactor = 0.5;
    } else {
      // New options-based constructor
      this.registryUrl = options.registryUrl.replace(/\/$/, '');
      this.apiKey = options.apiKey || process.env.AIP_API_KEY;
      this.timeout = options.timeout || 30000;
      this.maxRetries = options.maxRetries || 3;
      this.backoffFactor = options.backoffFactor || 0.5;
    }
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

    return (await response.json()) as RegistrationResponse;
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

    return (await response.json()) as AgentProfile;
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

    const data = (await response.json()) as SearchResponse;
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

    return (await response.json()) as UpdateResponse;
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

    return (await response.json()) as MetricsReportResponse;
  }

  /**
   * Search and fetch ALL matching agents (handles pagination automatically)
   * @param skill - Skill identifier (e.g., "text-generation")
   * @param minConfidence - Minimum confidence level (0.0 - 1.0), default 0.7
   * @param batchSize - Number of results per batch, default 20
   * @returns Complete list of all matching agent profiles
   */
  async searchAll(
    skill: string,
    minConfidence: number = 0.7,
    batchSize: number = 20
  ): Promise<AgentProfile[]> {
    const allAgents: AgentProfile[] = [];
    let offset = 0;

    while (true) {
      const params = new URLSearchParams({
        skill,
        min_confidence: minConfidence.toString(),
        limit: batchSize.toString(),
        offset: offset.toString(),
      });

      const response = await this.fetch(`/agents?${params.toString()}`);

      if (!response.ok) {
        throw await this.handleError(response);
      }

      const data = (await response.json()) as SearchResponse;
      
      if (data.results.length === 0) {
        break;
      }

      allAgents.push(...data.results);
      offset += batchSize;

      // Safety check to prevent infinite loops
      if (allAgents.length > 10000) {
        throw new Error('Too many results (>10,000), please refine your search');
      }
    }

    return allAgents;
  }

  /**
   * Check registry health status
   * @returns Health check response with status and database connectivity
   */
  async healthCheck(): Promise<{ status: string; timestamp: string; database: string }> {
    const response = await this.fetch('/health');

    if (!response.ok) {
      throw await this.handleError(response);
    }

    return (await response.json()) as { status: string; timestamp: string; database: string };
  }

  /**
   * Internal fetch wrapper with authentication and retry logic
   */
  private async fetch(path: string, options: RequestInit = {}): Promise<Response> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    // Merge user headers
    if (options.headers) {
      const userHeaders = options.headers as Record<string, string>;
      Object.assign(headers, userHeaders);
    }

    if (this.apiKey) {
      headers['Authorization'] = `Bearer ${this.apiKey}`;
    }

    let lastError: Error | null = null;

    // Retry logic
    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.timeout);

        const response = await fetch(`${this.registryUrl}${path}`, {
          ...options,
          headers,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        // Don't retry on client errors (4xx except 429)
        if (response.status >= 400 && response.status < 500 && response.status !== 429) {
          return response;
        }

        // Retry on 429, 500, 502, 503, 504
        if ([429, 500, 502, 503, 504].includes(response.status)) {
          if (attempt < this.maxRetries) {
            const delay = this.calculateBackoff(attempt);
            await this.sleep(delay);
            continue;
          }
        }

        return response;
      } catch (error) {
        lastError = error as Error;

        // Don't retry on timeout or network errors if max attempts reached
        if (attempt >= this.maxRetries) {
          throw lastError;
        }

        // Wait before retrying
        const delay = this.calculateBackoff(attempt);
        await this.sleep(delay);
      }
    }

    throw lastError || new Error('Request failed after retries');
  }

  /**
   * Calculate exponential backoff delay
   */
  private calculateBackoff(attempt: number): number {
    return Math.min(1000 * Math.pow(2, attempt) * this.backoffFactor, 30000);
  }

  /**
   * Sleep for specified milliseconds
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Handle error responses
   */
  private async handleError(response: Response): Promise<Error> {
    let errorData: ErrorResponse;
    try {
      errorData = (await response.json()) as ErrorResponse;
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
