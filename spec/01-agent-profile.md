# AIP Spec 01: Agent Profile Schema

**Status**: Draft  
**Version**: 0.1.0  
**Last Updated**: 2025-02-15

---

## Overview

This document defines the structure and semantics of an **Agent Profile**, the core data structure in the Agent Identity Protocol (AIP).

## Purpose

An Agent Profile serves as:
1. A **machine-readable identity card** for AI agents
2. A **capability declaration** (what the agent can do)
3. A **performance record** (how well it does it)
4. A **discovery endpoint** (how to interact with it)

## Design Principles

- **Minimal required fields**: Only `id`, `name`, `version`, and `capabilities` are mandatory
- **Extensible**: Additional fields and metadata can be added without breaking compatibility
- **Self-contained**: A profile should be understandable without external context
- **Verifiable**: Claims should be provable (via signatures, proofs, etc.)

## Schema Definition

### 1. Required Fields

#### 1.1 `id` (AgentId)

**Type**: `string` (URI)  
**Description**: Unique, persistent identifier for the agent  
**Format**: DID or HTTPS URL

**Examples**:
```
did:aip:content-writer-123
did:web:myagent.example.com
https://registry.example.com/agents/12345
```

**Constraints**:
- MUST be globally unique
- MUST be persistent (should not change across updates)
- SHOULD use a decentralized identifier (DID) for portability

**Rationale**: A stable ID allows agents to maintain reputation across registries and updates.

---

#### 1.2 `name`

**Type**: `string`  
**Description**: Human-readable name for the agent  
**Max Length**: 100 characters

**Examples**:
```
ContentWriterPro
DataAnalyzerBot
TranslationAgent
```

**Constraints**:
- MUST be at least 1 character
- SHOULD be descriptive and unique within a registry

**Rationale**: Humans need a readable name for discovery and selection.

---

#### 1.3 `version`

**Type**: `string`  
**Description**: Semantic version of the agent  
**Format**: Semver (MAJOR.MINOR.PATCH)

**Examples**:
```
1.0.0
2.3.1-beta
0.1.0-rc.1
```

**Constraints**:
- MUST follow [semver.org](https://semver.org) specification
- SHOULD increment MAJOR for breaking changes

**Rationale**: Enables clients to track compatibility and breaking changes.

---

#### 1.4 `capabilities`

**Type**: `array<Capability>`  
**Description**: List of skills the agent can perform  
**Min Length**: 1

**Schema**:
```typescript
interface Capability {
  skill: string;              // Required
  confidence: number;         // Required (0.0 - 1.0)
  parameters?: object;        // Optional
}
```

**Example**:
```json
{
  "capabilities": [
    {
      "skill": "text-generation",
      "confidence": 0.95,
      "parameters": {
        "input_formats": ["text", "json"],
        "output_formats": ["markdown"],
        "languages": ["en", "ja"]
      }
    },
    {
      "skill": "translation",
      "confidence": 0.88,
      "parameters": {
        "languages": ["en", "ja", "es"]
      }
    }
  ]
}
```

**Constraints**:
- MUST have at least one capability
- `skill` SHOULD use a standardized taxonomy (see Appendix A)
- `confidence` MUST be between 0.0 and 1.0

**Rationale**: Capabilities enable skill-based discovery and matching.

---

### 2. Optional Fields

#### 2.1 `description`

**Type**: `string`  
**Max Length**: 500 characters  
**Description**: Human-readable summary of what the agent does

**Example**:
```
"Professional content generation in 10+ languages with SEO optimization"
```

---

#### 2.2 `endpoints`

**Type**: `object`  
**Description**: API endpoints for interacting with the agent

**Schema**:
```typescript
interface Endpoints {
  api?: string;      // Main API endpoint
  health?: string;   // Health check endpoint
  docs?: string;     // Documentation URL
  [key: string]: any; // Custom endpoints
}
```

**Example**:
```json
{
  "endpoints": {
    "api": "https://agent.example.com/api/v2",
    "health": "https://agent.example.com/health",
    "docs": "https://agent.example.com/docs",
    "websocket": "wss://agent.example.com/ws"
  }
}
```

**Best Practices**:
- Use HTTPS for production
- Include versioning in API URL (`/api/v2`)
- Provide OpenAPI/Swagger docs at `docs` URL

---

#### 2.3 `pricing`

**Type**: `object`  
**Description**: Cost information for using the agent

**Schema**:
```typescript
interface Pricing {
  model: 'free' | 'per-task' | 'subscription' | 'custom';
  base_price?: number;
  currency?: string;  // ISO 4217 (e.g., "USD", "EUR")
  [key: string]: any;
}
```

**Examples**:
```json
// Free
{ "model": "free" }

// Per-task pricing
{
  "model": "per-task",
  "base_price": 0.05,
  "currency": "USD"
}

// Subscription
{
  "model": "subscription",
  "base_price": 99.00,
  "currency": "USD",
  "billing_period": "monthly"
}
```

---

#### 2.4 `metrics`

**Type**: `object`  
**Description**: Performance metrics (objective, verifiable data)

**Schema**:
```typescript
interface Metrics {
  tasks_completed?: number;
  avg_response_time_ms?: number;
  success_rate?: number;      // 0.0 - 1.0
  uptime_30d?: number;         // 0.0 - 1.0
  [key: string]: any;          // Custom metrics
}
```

**Example**:
```json
{
  "metrics": {
    "tasks_completed": 12470,
    "avg_response_time_ms": 1150,
    "success_rate": 0.987,
    "uptime_30d": 0.998,
    "custom_metric_quality_score": 0.92
  }
}
```

**Best Practices**:
- Report actual measurements, not estimates
- Update metrics regularly (daily/weekly)
- Use standard names for common metrics

---

#### 2.5 `metadata`

**Type**: `object`  
**Description**: Arbitrary key-value pairs for extensibility

**Example**:
```json
{
  "metadata": {
    "framework": "langchain",
    "model_provider": "anthropic",
    "gpu_required": true,
    "certifications": ["ISO27001", "SOC2"],
    "last_updated": "2025-02-15T00:00:00Z"
  }
}
```

**Use Cases**:
- Platform-specific information
- Custom tags for filtering
- Audit trails
- Compliance data

---

#### 2.6 `proof_of_work`

**Type**: `object`  
**Description**: References to verifiable work samples

**Schema**:
```typescript
interface ProofOfWork {
  type: 'ipfs' | 'blockchain' | 'signed' | 'custom';
  references: string[];
}
```

**Example**:
```json
{
  "proof_of_work": {
    "type": "ipfs",
    "references": [
      "ipfs://QmXyZ123...",
      "ipfs://QmAbc456..."
    ]
  }
}
```

---

## Validation Rules

### Schema Validation

Registries MUST validate profiles against this schema before accepting them:

```javascript
const schema = {
  type: 'object',
  required: ['id', 'name', 'version', 'capabilities'],
  properties: {
    id: { type: 'string', format: 'uri' },
    name: { type: 'string', minLength: 1, maxLength: 100 },
    version: { type: 'string', pattern: '^\\d+\\.\\d+\\.\\d+' },
    capabilities: {
      type: 'array',
      minItems: 1,
      items: {
        type: 'object',
        required: ['skill', 'confidence'],
        properties: {
          skill: { type: 'string' },
          confidence: { type: 'number', minimum: 0, maximum: 1 }
        }
      }
    }
  }
};
```

### Business Rules

1. **Unique ID**: Within a registry, no two agents can share the same `id`
2. **Version Monotonicity**: Updates SHOULD have a higher version number
3. **Confidence Bounds**: All `confidence` values MUST be 0.0 - 1.0
4. **URL Format**: All `endpoints` URLs MUST be valid HTTP(S) URIs

## Extensibility

Agents MAY add custom fields not defined in this spec:

```json
{
  "id": "did:aip:custom-agent",
  "name": "CustomAgent",
  "version": "1.0.0",
  "capabilities": [...],
  "custom_field": "custom_value"
}
```

Registries SHOULD:
- Accept unknown fields (forward compatibility)
- Preserve unknown fields when returning profiles
- NOT validate unknown fields strictly

## Examples

### Minimal Profile

```json
{
  "id": "did:aip:minimal-agent",
  "name": "MinimalAgent",
  "version": "1.0.0",
  "capabilities": [
    { "skill": "echo", "confidence": 1.0 }
  ]
}
```

### Complete Profile

See [SPECIFICATION.md Section 3.4](../SPECIFICATION.md#34-example-profile)

---

## Appendix A: Skill Taxonomy

Recommended skill identifiers:

- `text-generation`
- `text-summarization`
- `translation`
- `sentiment-analysis`
- `data-analysis`
- `data-visualization`
- `image-generation`
- `image-classification`
- `video-generation`
- `code-generation`
- `code-review`

For custom skills, use namespacing: `custom:my-skill`

---

**Next**: [02-metrics.md](./02-metrics.md)
