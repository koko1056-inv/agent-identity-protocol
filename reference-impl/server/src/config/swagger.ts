/**
 * OpenAPI/Swagger configuration
 */

export const swaggerDefinition = {
  openapi: '3.0.0',
  info: {
    title: 'Agent Identity Protocol (AIP) Registry API',
    version: '0.3.1',
    description: `
# Agent Identity Protocol Registry API

A decentralized identity and discovery protocol for AI agents.

## Features

- 🔍 **Agent Discovery** - Search agents by skill and capabilities
- ✅ **Capability Verification** - Objective performance metrics
- 📊 **Performance Tracking** - Monitor agent success rates and response times
- 🔐 **API Key Authentication** - Secure write operations

## Authentication

Write operations (register, update, delete) require an API key when \`REQUIRE_API_KEY=true\`.

Include the API key in the \`Authorization\` header:
\`\`\`
Authorization: Bearer aip_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
\`\`\`

## Rate Limits

- **Search/Read**: 100 requests/minute
- **Write**: 10 requests/minute
- **Register**: 5 requests/minute

Custom rate limits can be configured per API key.
    `,
    license: {
      name: 'MIT',
      url: 'https://opensource.org/licenses/MIT',
    },
    contact: {
      name: 'AIP Community',
      url: 'https://github.com/koko1056-inv/agent-identity-protocol',
    },
  },
  servers: [
    {
      url: 'http://localhost:3000',
      description: 'Development server',
    },
    {
      url: 'https://registry.aip.dev',
      description: 'Production server (example)',
    },
  ],
  tags: [
    {
      name: 'Agents',
      description: 'Agent registration, discovery, and management',
    },
    {
      name: 'Metrics',
      description: 'Performance metrics reporting and tracking',
    },
    {
      name: 'Admin',
      description: 'API key management (requires admin authentication)',
    },
    {
      name: 'Health',
      description: 'System health and status',
    },
  ],
  components: {
    securitySchemes: {
      ApiKeyAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'API Key',
        description: 'API key for write operations. Format: `Bearer aip_xxxxxxxxxx`',
      },
      AdminKeyAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'Admin Key',
        description: 'Admin master key for /admin endpoints',
      },
    },
    schemas: {
      AgentProfile: {
        type: 'object',
        required: ['id', 'name', 'version', 'capabilities'],
        properties: {
          id: {
            type: 'string',
            description: 'Unique agent identifier (DID recommended: did:aip:xxx)',
            example: 'did:aip:my-agent',
          },
          name: {
            type: 'string',
            minLength: 1,
            maxLength: 100,
            description: 'Human-readable agent name',
            example: 'ContentBot',
          },
          version: {
            type: 'string',
            pattern: '^\\d+\\.\\d+\\.\\d+',
            description: 'Semantic version (semver)',
            example: '1.0.0',
          },
          description: {
            type: 'string',
            maxLength: 500,
            description: 'Agent description',
            example: 'An AI agent for content generation and text processing',
          },
          capabilities: {
            type: 'array',
            minItems: 1,
            items: {
              $ref: '#/components/schemas/Capability',
            },
          },
          endpoints: {
            $ref: '#/components/schemas/Endpoints',
          },
          pricing: {
            $ref: '#/components/schemas/Pricing',
          },
          metrics: {
            $ref: '#/components/schemas/Metrics',
          },
          metadata: {
            type: 'object',
            description: 'Additional metadata (max 10KB)',
            additionalProperties: true,
          },
          proof_of_work: {
            $ref: '#/components/schemas/ProofOfWork',
          },
        },
      },
      Capability: {
        type: 'object',
        required: ['skill', 'confidence'],
        properties: {
          skill: {
            type: 'string',
            pattern: '^[a-z0-9-]+$',
            description: 'Skill identifier (lowercase, alphanumeric, hyphens)',
            example: 'text-generation',
          },
          confidence: {
            type: 'number',
            minimum: 0,
            maximum: 1,
            description: 'Confidence level (0.0 - 1.0)',
            example: 0.95,
          },
          parameters: {
            type: 'object',
            description: 'Skill-specific parameters',
            additionalProperties: true,
          },
        },
      },
      Endpoints: {
        type: 'object',
        properties: {
          api: {
            type: 'string',
            format: 'uri',
            description: 'API endpoint URL',
          },
          health: {
            type: 'string',
            format: 'uri',
            description: 'Health check endpoint',
          },
          docs: {
            type: 'string',
            format: 'uri',
            description: 'Documentation URL',
          },
        },
      },
      Pricing: {
        type: 'object',
        required: ['model'],
        properties: {
          model: {
            type: 'string',
            enum: ['free', 'per-task', 'subscription', 'custom'],
            description: 'Pricing model',
          },
          base_price: {
            type: 'number',
            minimum: 0,
            description: 'Base price (required for non-free models)',
          },
          currency: {
            type: 'string',
            pattern: '^[A-Z]{3}$',
            description: '3-letter ISO currency code',
            example: 'USD',
          },
        },
      },
      Metrics: {
        type: 'object',
        properties: {
          tasks_completed: {
            type: 'integer',
            minimum: 0,
            description: 'Total tasks completed',
          },
          avg_response_time_ms: {
            type: 'integer',
            minimum: 0,
            description: 'Average response time in milliseconds',
          },
          success_rate: {
            type: 'number',
            minimum: 0,
            maximum: 1,
            description: 'Success rate (0.0 - 1.0)',
          },
          uptime_30d: {
            type: 'number',
            minimum: 0,
            maximum: 1,
            description: 'Uptime in last 30 days (0.0 - 1.0)',
          },
        },
      },
      ProofOfWork: {
        type: 'object',
        required: ['type', 'references'],
        properties: {
          type: {
            type: 'string',
            enum: ['ipfs', 'blockchain', 'signed', 'custom'],
            description: 'Proof type',
          },
          references: {
            type: 'array',
            minItems: 1,
            items: {
              type: 'string',
            },
            description: 'Proof references (IPFS CIDs, blockchain hashes, etc.)',
          },
        },
      },
      Error: {
        type: 'object',
        properties: {
          error: {
            type: 'string',
            description: 'Error message',
          },
          code: {
            type: 'string',
            description: 'Error code',
          },
          details: {
            description: 'Additional error details',
          },
          requestId: {
            type: 'string',
            description: 'Request ID for debugging',
          },
        },
      },
    },
  },
};

export const swaggerOptions = {
  swaggerDefinition,
  apis: ['./src/routes/*.ts', './src/index.ts'],
};
