import { z } from 'zod';

// Custom refinements and error messages

// Capability schema with improved validation
export const CapabilitySchema = z.object({
  skill: z.string().min(1, 'Skill identifier cannot be empty').regex(/^[a-z0-9-]+$/, {
    message: 'Skill must contain only lowercase letters, numbers, and hyphens',
  }),
  confidence: z.number().min(0, 'Confidence must be >= 0').max(1, 'Confidence must be <= 1'),
  parameters: z.any().optional(),
});

// Pricing schema
export const PricingSchema = z
  .object({
    model: z.enum(['free', 'per-task', 'subscription', 'custom'], {
      errorMap: () => ({ message: 'Pricing model must be: free, per-task, subscription, or custom' }),
    }),
    base_price: z.number().nonnegative('Price must be non-negative').optional(),
    currency: z
      .string()
      .length(3, 'Currency must be a 3-letter ISO code (e.g., USD, EUR)')
      .regex(/^[A-Z]{3}$/, 'Currency must be uppercase (e.g., USD)')
      .optional(),
  })
  .passthrough()
  .refine(
    (data) => {
      // If model is not free, base_price should be provided
      if (data.model !== 'free' && data.base_price === undefined) {
        return false;
      }
      return true;
    },
    {
      message: 'base_price is required for non-free pricing models',
    }
  );

// Endpoints schema with URL validation
export const EndpointsSchema = z
  .object({
    api: z.string().url('API endpoint must be a valid URL').optional(),
    health: z.string().url('Health endpoint must be a valid URL').optional(),
    docs: z.string().url('Docs endpoint must be a valid URL').optional(),
  })
  .passthrough();

// Metrics schema
export const MetricsSchema = z
  .object({
    tasks_completed: z
      .number()
      .int('Tasks completed must be an integer')
      .nonnegative('Tasks completed must be >= 0')
      .optional(),
    avg_response_time_ms: z
      .number()
      .int('Response time must be an integer')
      .nonnegative('Response time must be >= 0')
      .max(300000, 'Response time seems unrealistic (> 5 minutes)')
      .optional(),
    success_rate: z.number().min(0, 'Success rate must be >= 0').max(1, 'Success rate must be <= 1').optional(),
    uptime_30d: z.number().min(0, 'Uptime must be >= 0').max(1, 'Uptime must be <= 1').optional(),
  })
  .passthrough();

// Proof of work schema
export const ProofOfWorkSchema = z.object({
  type: z.enum(['ipfs', 'blockchain', 'signed', 'custom'], {
    errorMap: () => ({ message: 'Proof type must be: ipfs, blockchain, signed, or custom' }),
  }),
  references: z
    .array(z.string().min(1, 'Reference cannot be empty'))
    .min(1, 'At least one proof reference is required'),
});

// Enhanced Agent ID validation
const AgentIDSchema = z.string().min(1, 'Agent ID cannot be empty').refine(
  (id) => {
    // Recommended format: did:aip:{identifier}
    // But also allow other formats for flexibility
    if (id.startsWith('did:aip:')) {
      const identifier = id.substring(8);
      return identifier.length > 0 && /^[a-zA-Z0-9-_]+$/.test(identifier);
    }
    // Allow other formats but warn via logging
    return true;
  },
  {
    message: 'Recommended format: did:aip:{identifier} (alphanumeric, hyphens, underscores)',
  }
);

// Semver validation with more detailed checks
const SemverSchema = z
  .string()
  .regex(/^\d+\.\d+\.\d+(-[a-zA-Z0-9.-]+)?(\+[a-zA-Z0-9.-]+)?$/, {
    message: 'Version must follow semver format (e.g., 1.0.0, 1.2.3-beta, 2.0.0+build.123)',
  })
  .refine(
    (version) => {
      const [major] = version.split('.').map(Number);
      return major >= 0;
    },
    {
      message: 'Major version must be >= 0',
    }
  );

// Main Agent profile schema with enhanced validation
export const AgentProfileSchema = z.object({
  id: AgentIDSchema,
  name: z
    .string()
    .min(1, 'Name cannot be empty')
    .max(100, 'Name must be <= 100 characters')
    .trim(),
  version: SemverSchema,
  capabilities: z
    .array(CapabilitySchema)
    .min(1, 'At least one capability is required')
    .max(50, 'Maximum 50 capabilities allowed'),
  description: z
    .string()
    .max(500, 'Description must be <= 500 characters')
    .optional()
    .transform((val) => (val === '' ? undefined : val)),
  endpoints: EndpointsSchema.optional(),
  pricing: PricingSchema.optional(),
  metadata: z
    .record(z.any())
    .optional()
    .refine(
      (metadata) => {
        if (!metadata) return true;
        // Limit metadata size
        const size = JSON.stringify(metadata).length;
        return size <= 10000; // 10KB limit
      },
      {
        message: 'Metadata size must be <= 10KB',
      }
    ),
  proof_of_work: ProofOfWorkSchema.optional(),
});

// Metrics update schema (requires at least tasks_completed)
export const MetricsUpdateSchema = MetricsSchema.extend({
  tasks_completed: z.number().int().nonnegative(),
}).strict({
  message: 'Only allowed fields: tasks_completed, avg_response_time_ms, success_rate, uptime_30d',
});

// Search query schema with improved parsing
export const SearchQuerySchema = z.object({
  skill: z
    .string()
    .optional()
    .refine(
      (skill) => {
        if (!skill) return true;
        return /^[a-z0-9-]+$/.test(skill);
      },
      {
        message: 'Skill must contain only lowercase letters, numbers, and hyphens',
      }
    ),
  min_confidence: z
    .string()
    .optional()
    .transform((val) => (val ? parseFloat(val) : 0.7))
    .pipe(z.number().min(0, 'min_confidence must be >= 0').max(1, 'min_confidence must be <= 1')),
  limit: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 20))
    .pipe(
      z
        .number()
        .int('limit must be an integer')
        .positive('limit must be > 0')
        .max(100, 'Maximum limit is 100')
    ),
  offset: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 0))
    .pipe(z.number().int('offset must be an integer').nonnegative('offset must be >= 0')),
});

export type AgentProfile = z.infer<typeof AgentProfileSchema>;
export type Capability = z.infer<typeof CapabilitySchema>;
export type Metrics = z.infer<typeof MetricsSchema>;
export type SearchQuery = z.infer<typeof SearchQuerySchema>;
