# Agent Identity Protocol (AIP) Specification v0.1.0

**Status**: Draft  
**Last Updated**: 2025-02-15  
**Authors**: Agent Identity Protocol Working Group

---

## Abstract

The Agent Identity Protocol (AIP) defines a lightweight, decentralized standard for AI agents to declare capabilities, prove performance, and discover collaborators. This specification enables interoperability across agent frameworks, marketplaces, and orchestration systems without platform lock-in.

## 1. Introduction

### 1.1 Motivation

As AI agents proliferate, several problems emerge:

1. **Discoverability**: No standard way to find agents by capability
2. **Verification**: Claims about agent capabilities are unverifiable
3. **Portability**: Reputation/history is locked to specific platforms
4. **Interoperability**: Agents cannot easily collaborate across frameworks

AIP addresses these by providing:
- A standard schema for agent profiles
- Objective, verifiable performance metrics
- A federated registry architecture
- API specifications for discovery and interaction

### 1.2 Design Goals

- **Simplicity**: Minimal required fields, easy to implement
- **Extensibility**: Plugin system for custom metrics/capabilities
- **Verifiability**: Cryptographic proof for critical claims
- **Decentralization**: No single point of control or failure
- **Privacy**: Agents control what data they share

### 1.3 Non-Goals

- Building a centralized marketplace
- Implementing smart contracts (though compatible with them)
- Defining task execution protocols (out of scope)
- Replacing existing agent frameworks (complement, don't compete)

## 2. Core Concepts

### 2.1 Agent

An **Agent** is an autonomous or semi-autonomous software entity that performs tasks. Examples:
- A Clawdbot skill
- A LangChain agent
- An AutoGPT instance
- A custom API service

### 2.2 Agent Profile

An **Agent Profile** is a structured document describing an agent's:
- **Identity** (unique ID, name, version)
- **Capabilities** (what it can do)
- **Endpoints** (how to interact with it)
- **Metrics** (historical performance data)
- **Pricing** (optional cost information)

### 2.3 Registry

A **Registry** is a service that:
- Stores agent profiles
- Provides search/discovery APIs
- Optionally validates/verifies profiles

Registries can be:
- **Public** (anyone can register/search)
- **Private** (organization-internal)
- **Federated** (syncs with other registries)

### 2.4 Capability

A **Capability** describes a discrete skill or function, e.g.:
- `text-generation`
- `data-analysis`
- `image-classification`

Each capability has:
- **Skill identifier** (string)
- **Confidence level** (0.0 - 1.0)
- **Parameters** (optional, for input/output specs)

## 3. Agent Profile Schema

### 3.1 Required Fields

```yaml
AgentProfile:
  id: string (URI)              # Unique identifier (DID or URL)
  name: string                   # Human-readable name
  version: string                # Semver version
  capabilities: array<Capability> # List of skills
```

### 3.2 Optional Fields

```yaml
  description: string            # Human-readable description
  endpoints:
    api: string (URI)            # Main API endpoint
    health: string (URI)         # Health check endpoint
    docs: string (URI)           # API documentation
  pricing:
    model: enum                  # "free" | "per-task" | "subscription"
    base_price: number           # Base cost
    currency: string             # USD, EUR, etc.
  metrics:
    tasks_completed: integer     # Total tasks finished
    avg_response_time_ms: integer # Average latency
    success_rate: number         # 0.0 - 1.0
    uptime_30d: number           # 0.0 - 1.0
  metadata:
    [key: string]: any           # Extensible key-value pairs
  proof_of_work:
    type: string                 # "ipfs" | "blockchain" | "signed"
    references: array<string>    # IPFS hashes, tx IDs, etc.
```

### 3.3 Capability Schema

```yaml
Capability:
  skill: string                  # e.g., "text-generation"
  confidence: number             # 0.0 - 1.0 (self-assessed quality)
  parameters:
    input_formats: array<string> # ["text", "json", ...]
    output_formats: array<string>
    languages: array<string>     # ["en", "ja", ...]
    constraints:
      max_input_length: integer  # Optional limits
      avg_duration_ms: integer
```

### 3.4 Example Profile

```json
{
  "id": "did:aip:content-writer-pro",
  "name": "ContentWriterPro",
  "version": "2.1.0",
  "description": "Professional content generation in 10+ languages",
  "capabilities": [
    {
      "skill": "text-generation",
      "confidence": 0.95,
      "parameters": {
        "input_formats": ["text", "json"],
        "output_formats": ["markdown", "html"],
        "languages": ["en", "ja", "es", "fr"],
        "constraints": {
          "max_input_length": 10000,
          "avg_duration_ms": 1200
        }
      }
    },
    {
      "skill": "translation",
      "confidence": 0.88,
      "parameters": {
        "languages": ["en", "ja"]
      }
    }
  ],
  "endpoints": {
    "api": "https://content-writer.example.com/api/v2",
    "health": "https://content-writer.example.com/health",
    "docs": "https://content-writer.example.com/docs"
  },
  "pricing": {
    "model": "per-task",
    "base_price": 0.05,
    "currency": "USD"
  },
  "metrics": {
    "tasks_completed": 12470,
    "avg_response_time_ms": 1150,
    "success_rate": 0.987,
    "uptime_30d": 0.998
  },
  "metadata": {
    "platform": "clawdbot",
    "framework": "langchain",
    "model_provider": "anthropic",
    "last_updated": "2025-02-15T00:00:00Z"
  }
}
```

## 4. API Specification

### 4.1 Registry Endpoints

All registries MUST implement the following HTTP endpoints:

#### 4.1.1 Register Agent

```
POST /agents
Content-Type: application/json

Body: AgentProfile

Response:
  201 Created
  {
    "id": "did:aip:agent-123",
    "registered_at": "2025-02-15T00:00:00Z"
  }
```

#### 4.1.2 Get Agent Profile

```
GET /agents/{agentId}

Response:
  200 OK
  Body: AgentProfile

  404 Not Found
  {
    "error": "Agent not found"
  }
```

#### 4.1.3 Search Agents

```
GET /agents?skill={skill}&min_confidence={0.0-1.0}&limit={N}

Response:
  200 OK
  {
    "results": [AgentProfile, ...],
    "total": 127,
    "page": 1
  }
```

#### 4.1.4 Update Agent

```
PUT /agents/{agentId}
Content-Type: application/json
Authorization: Bearer <token>

Body: AgentProfile

Response:
  200 OK
  {
    "updated_at": "2025-02-15T00:01:00Z"
  }
```

#### 4.1.5 Delete Agent

```
DELETE /agents/{agentId}
Authorization: Bearer <token>

Response:
  204 No Content
```

#### 4.1.6 Report Metrics

```
POST /agents/{agentId}/metrics
Content-Type: application/json
Authorization: Bearer <token>

Body:
{
  "tasks_completed": 150,
  "avg_response_time_ms": 1100,
  "success_rate": 0.99,
  "uptime_30d": 0.999
}

Response:
  200 OK
  {
    "recorded_at": "2025-02-15T00:02:00Z"
  }
```

### 4.2 Authentication

Registries SHOULD implement token-based authentication for:
- Updating profiles
- Deleting agents
- Reporting metrics

Recommended: JWT or API keys.

### 4.3 Rate Limiting

Registries SHOULD implement rate limiting:
- **Public search**: 100 requests/minute/IP
- **Registration**: 10 requests/minute/IP
- **Updates**: 60 requests/minute/agent

Headers:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 87
X-RateLimit-Reset: 1645123456
```

## 5. Verification & Trust

### 5.1 Self-Reported Metrics

By default, metrics are **self-reported** (agent reports its own performance). This is acceptable for early-stage ecosystems.

### 5.2 Verified Metrics

For higher trust, registries MAY implement:

#### 5.2.1 Third-Party Verification
- A separate service runs tasks and reports results
- Registry stores both self-reported and verified metrics

#### 5.2.2 Cryptographic Proofs
- Agents sign their metrics with a private key
- Registry verifies signatures with the public key
- Example: Ed25519 signatures

```json
{
  "metrics": { ... },
  "signature": {
    "type": "Ed25519Signature2020",
    "created": "2025-02-15T00:00:00Z",
    "proofValue": "z58DAdFfa9SkqZMVPxAQpic7ndSayn1PzZs6ZjWp1CktyGesju..."
  }
}
```

#### 5.2.3 Blockchain/IPFS
- Store metrics on-chain or IPFS
- Registry references the hash
- Anyone can verify independently

### 5.3 Proof of Work

Agents MAY include references to completed work:

```json
{
  "proof_of_work": {
    "type": "ipfs",
    "references": [
      "ipfs://QmXyZ...",  // Sample output #1
      "ipfs://QmAbc..."   // Sample output #2
    ]
  }
}
```

## 6. Decentralization & Federation

### 6.1 Registry Independence

No single registry is authoritative. Agents MAY:
- Register with multiple registries
- Self-host their profile (did:web)
- Update all registries simultaneously

### 6.2 Federation (Future)

Registries MAY federate by:
- Syncing profiles periodically
- Implementing a gossip protocol
- Using ActivityPub or similar

**Status**: Not yet specified (v0.1.0)

## 7. Extensibility

### 7.1 Custom Capabilities

Agents MAY define custom skills:

```json
{
  "skill": "custom:3d-model-generation",
  "confidence": 0.92,
  "parameters": {
    "input_formats": ["text"],
    "output_formats": ["obj", "gltf"]
  }
}
```

Registries SHOULD index custom skills for searchability.

### 7.2 Metadata

The `metadata` field allows arbitrary key-value pairs:

```json
{
  "metadata": {
    "gpu_required": true,
    "framework": "pytorch",
    "certifications": ["ISO27001"]
  }
}
```

Registries MAY allow filtering by metadata fields.

## 8. Security Considerations

### 8.1 Profile Integrity

- Registries SHOULD validate JSON schema before accepting profiles
- Agents SHOULD use HTTPS for all endpoints
- Sensitive data SHOULD NOT be stored in profiles (use references)

### 8.2 DDoS Protection

- Rate limiting (see 4.3)
- CAPTCHA for public registration
- IP-based throttling

### 8.3 Privacy

- Agents control what they share (opt-in)
- Registries SHOULD allow agents to delete their data
- GDPR compliance for EU-based registries

## 9. Compliance

### 9.1 Versioning

Profiles MUST include a `version` field (semver).

Registries SHOULD support multiple protocol versions.

### 9.2 Deprecation

When fields are deprecated:
- Mark as `@deprecated` in schema
- Provide migration path in release notes
- Support for 6 months minimum

## 10. Future Work

- **Identity**: W3C DID integration
- **Federation**: Cross-registry sync protocol
- **Reputation**: Algorithmic trust scoring
- **Payments**: Integration with crypto/fiat rails

## 11. References

- [W3C Decentralized Identifiers (DIDs)](https://www.w3.org/TR/did-core/)
- [W3C Verifiable Credentials](https://www.w3.org/TR/vc-data-model/)
- [OpenAPI Specification](https://swagger.io/specification/)
- [Semver](https://semver.org/)

---

## Appendix A: Skill Taxonomy

Suggested (non-normative) skill categories:

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
- `api-integration`

Agents MAY use custom skills with namespacing: `custom:my-skill`

## Appendix B: Example SDK Usage

See [examples/basic-agent](./examples/basic-agent) for complete code.

---

**END OF SPECIFICATION v0.1.0**
