import { z } from 'zod';

// Capability schema
export const CapabilitySchema = z.object({
  skill: z.string().min(1),
  confidence: z.number().min(0).max(1),
  parameters: z.any().optional(),
});

// Pricing schema
export const PricingSchema = z.object({
  model: z.enum(['free', 'per-task', 'subscription', 'custom']),
  base_price: z.number().optional(),
  currency: z.string().optional(),
}).passthrough(); // Allow additional fields

// Endpoints schema
export const EndpointsSchema = z.object({
  api: z.string().url().optional(),
  health: z.string().url().optional(),
  docs: z.string().url().optional(),
}).passthrough();

// Metrics schema
export const MetricsSchema = z.object({
  tasks_completed: z.number().int().nonnegative().optional(),
  avg_response_time_ms: z.number().int().nonnegative().optional(),
  success_rate: z.number().min(0).max(1).optional(),
  uptime_30d: z.number().min(0).max(1).optional(),
}).passthrough();

// Proof of work schema
export const ProofOfWorkSchema = z.object({
  type: z.enum(['ipfs', 'blockchain', 'signed', 'custom']),
  references: z.array(z.string()),
});

// Main Agent profile schema
export const AgentProfileSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(100),
  version: z.string().regex(/^\d+\.\d+\.\d+/, {
    message: 'Version must follow semver format (e.g., 1.0.0)',
  }),
  capabilities: z.array(CapabilitySchema).min(1, {
    message: 'At least one capability is required',
  }),
  description: z.string().max(500).optional(),
  endpoints: EndpointsSchema.optional(),
  pricing: PricingSchema.optional(),
  metadata: z.record(z.any()).optional(),
  proof_of_work: ProofOfWorkSchema.optional(),
});

// Metrics update schema
export const MetricsUpdateSchema = MetricsSchema.required({
  tasks_completed: true,
});

// Search query schema
export const SearchQuerySchema = z.object({
  skill: z.string().optional(),
  min_confidence: z.string().transform(Number).pipe(z.number().min(0).max(1)).optional(),
  limit: z.string().transform(Number).pipe(z.number().int().positive().max(100)).optional(),
  offset: z.string().transform(Number).pipe(z.number().int().nonnegative()).optional(),
});

export type AgentProfile = z.infer<typeof AgentProfileSchema>;
export type Capability = z.infer<typeof CapabilitySchema>;
export type Metrics = z.infer<typeof MetricsSchema>;
export type SearchQuery = z.infer<typeof SearchQuerySchema>;
