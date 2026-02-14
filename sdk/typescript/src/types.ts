/**
 * Agent Identity Protocol (AIP) Type Definitions
 * @version 0.1.0
 */

/**
 * Unique identifier for an agent (DID or URL)
 * @example "did:aip:content-writer-123"
 * @example "https://myagent.example.com/profile"
 */
export type AgentId = string;

/**
 * Capability describes a discrete skill or function
 */
export interface Capability {
  /** Skill identifier (e.g., "text-generation") */
  skill: string;
  
  /** Self-assessed confidence level (0.0 - 1.0) */
  confidence: number;
  
  /** Optional parameters describing I/O and constraints */
  parameters?: {
    input_formats?: string[];
    output_formats?: string[];
    languages?: string[];
    constraints?: {
      max_input_length?: number;
      avg_duration_ms?: number;
      [key: string]: any;
    };
    [key: string]: any;
  };
}

/**
 * Pricing model for agent services
 */
export interface Pricing {
  /** Pricing model type */
  model: 'free' | 'per-task' | 'subscription' | 'custom';
  
  /** Base price (in specified currency) */
  base_price?: number;
  
  /** Currency code (ISO 4217) */
  currency?: string;
  
  /** Additional pricing details */
  [key: string]: any;
}

/**
 * Performance metrics (objective, verifiable data)
 */
export interface Metrics {
  /** Total number of tasks completed */
  tasks_completed?: number;
  
  /** Average response time in milliseconds */
  avg_response_time_ms?: number;
  
  /** Success rate (0.0 - 1.0) */
  success_rate?: number;
  
  /** Uptime in last 30 days (0.0 - 1.0) */
  uptime_30d?: number;
  
  /** Custom metrics */
  [key: string]: any;
}

/**
 * API endpoints for interacting with the agent
 */
export interface Endpoints {
  /** Main API endpoint */
  api?: string;
  
  /** Health check endpoint */
  health?: string;
  
  /** API documentation URL */
  docs?: string;
  
  /** Custom endpoints */
  [key: string]: any;
}

/**
 * Proof of work references (for verification)
 */
export interface ProofOfWork {
  /** Type of proof storage */
  type: 'ipfs' | 'blockchain' | 'signed' | 'custom';
  
  /** References to verifiable work samples */
  references: string[];
}

/**
 * Complete agent profile
 */
export interface AgentProfile {
  /** Unique identifier (required) */
  id: AgentId;
  
  /** Human-readable name (required) */
  name: string;
  
  /** Semantic version (required) */
  version: string;
  
  /** List of capabilities (required) */
  capabilities: Capability[];
  
  /** Human-readable description (optional) */
  description?: string;
  
  /** API endpoints (optional) */
  endpoints?: Endpoints;
  
  /** Pricing information (optional) */
  pricing?: Pricing;
  
  /** Performance metrics (optional) */
  metrics?: Metrics;
  
  /** Arbitrary metadata (optional) */
  metadata?: Record<string, any>;
  
  /** Proof of work (optional) */
  proof_of_work?: ProofOfWork;
}

/**
 * Search response from registry
 */
export interface SearchResponse {
  /** Array of matching agent profiles */
  results: AgentProfile[];
  
  /** Total number of matches (before pagination) */
  total: number;
  
  /** Current page number */
  page: number;
  
  /** Number of results per page */
  per_page?: number;
}

/**
 * Registration response
 */
export interface RegistrationResponse {
  /** Agent ID */
  id: AgentId;
  
  /** Registration timestamp (ISO 8601) */
  registered_at: string;
}

/**
 * Update response
 */
export interface UpdateResponse {
  /** Update timestamp (ISO 8601) */
  updated_at: string;
}

/**
 * Metrics report response
 */
export interface MetricsReportResponse {
  /** Recording timestamp (ISO 8601) */
  recorded_at: string;
}

/**
 * Error response
 */
export interface ErrorResponse {
  /** Error message */
  error: string;
  
  /** Error code (optional) */
  code?: string;
  
  /** Additional details (optional) */
  details?: any;
}
