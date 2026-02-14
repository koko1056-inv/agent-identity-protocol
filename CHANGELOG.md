# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.2.0] - 2026-02-15

### Added

#### Server Improvements
- **Enhanced Logger** - Environment-based formatting (readable dev mode, JSON production)
- **Log Level Filtering** - Configurable via `LOG_LEVEL` environment variable
- **Performance Caching** - In-memory cache for search/agent queries (30-60s TTL)
- **Improved Error Handling** - Better error messages, Prisma error detection, request ID tracking
- **Enhanced Validation** - Detailed error messages, custom validators for IDs/semver/pricing

#### Python SDK
- **Automatic Retry Logic** - Exponential backoff for failed requests (configurable)
- **Helper Functions**:
  - `load_agent_from_file()` - Load agents from YAML/JSON
  - `save_agent_to_file()` - Save agents to files
  - `batch_register()` - Register multiple agents
  - `batch_delete()` - Delete multiple agents
  - `filter_agents_by_skill()` - Filter results
  - `sort_agents_by_metrics()` - Sort by performance
- **New Client Methods**:
  - `search_all()` - Fetch all results with automatic pagination
  - `health_check()` - Check registry health status
- **Context Manager Support** - Use `with AIPClient(...) as client:`

#### CLI Tools
- **Configuration File Support** - `~/.aip/config.yaml` for default settings
- **Config Management Commands**:
  - `aip config set <key> <value>` - Set configuration
  - `aip config get [key]` - View configuration
- **Batch Operations**:
  - `aip batch-register "pattern/*.yaml"` - Register multiple agents
  - `aip batch-delete id1 id2 ...` - Delete multiple agents
- **Enhanced Commands**:
  - `aip search --all` - Fetch all results (auto-pagination)
  - `aip get --save agent.yaml` - Save agent to file
  - `aip health` - Check registry health
- **Progress Indicators** - Rich progress bars for batch operations
- **Better Error Display** - Colored, formatted error messages

### Changed

- **Validation** - More strict validation rules with helpful error messages
- **Error Responses** - Include `requestId` for better debugging
- **Logger** - Development mode shows emoji, time, and readable format
- **Cache Invalidation** - Write operations (register/update/delete) clear relevant caches

### Fixed

- **Rate Limiting** - Properly applied to all routes
- **Error Stack Traces** - Only shown in development mode (security)
- **Pagination** - Improved handling in search queries

---

## [0.1.0] - 2026-02-08

### Added

#### Week 1 Implementation
- **Reference Server** (TypeScript + Express + Prisma)
  - Complete REST API implementation
  - PostgreSQL database schema
  - Rate limiting middleware
  - Request ID tracking
  - Structured logging
  - Environment variable validation
  - CORS configuration
  - Body size limits

#### Week 2 Implementation
- **Python SDK** - Complete implementation with Pydantic models
- **TypeScript SDK** - Type-safe client library
- **CLI Tools** - `aip` command for common operations
- **GitHub Actions** - Automated testing for server, SDKs, and CLI
- **Documentation** - API reference, usage examples
- **Examples** - Clawdbot integration, basic agent registration

### Core Features
- Agent registration and discovery
- Capability-based search
- Performance metrics reporting
- Health check endpoint
- Pagination support
- Error handling

---

## [0.7.0] - 2026-02-15

### Security Enhancements 🔒
- **API Key Hashing** - Keys now stored as SHA-256 hashes (CRITICAL fix)
  - Plain key only returned on creation
  - Authentication uses hash comparison
  - Eliminates plaintext key exposure risk

### Performance Optimizations ⚡
- **Database Index Optimization**:
  - Composite index on agents (name + version)
  - Compound index on capabilities (skill + confidence)
  - Performance indexes on metrics (success_rate, tasks_completed)
  - Active API keys lookup optimization
  - Reviews query optimization
  - Webhook event filtering optimization
- Improved query performance for common operations

### New Features 🆕
- **Bulk Operations API** (`/bulk/*`):
  - `POST /bulk/register` - Register up to 100 agents at once
  - `POST /bulk/delete` - Delete up to 100 agents at once
  - Detailed success/failure reporting per agent
  - Automatic webhook triggering
  - Transaction-safe operations

### Code Quality
- Added comprehensive improvement tracking (IMPROVEMENTS.md)
- Enhanced error logging
- Better code organization

---

## [0.6.0] - 2026-02-15

### Added

#### Reputation System (Complete)
- **Database Schema**:
  - `reviews` table - User reviews for agents (POSITIVE/NEUTRAL/NEGATIVE)
  - `reputation_scores` table - Calculated reputation scores
  - Review rating enum (POSITIVE, NEUTRAL, NEGATIVE)
- **Reputation Scoring Algorithm**:
  - Overall Score = weighted average of:
    - Performance Score (40%): Based on metrics (success rate, uptime, response time)
    - Reliability Score (30%): Based on historical consistency
    - Community Score (30%): Based on reviews
  - Automatic score recalculation on new reviews/metrics
- **API Endpoints** (`/reputation/*`):
  - `POST /reputation/agents/:id/reviews` - Submit review
  - `GET /reputation/agents/:id/reviews` - Get reviews
  - `GET /reputation/agents/:id/score` - Get reputation score
  - `GET /reputation/top-agents` - Get top-rated agents
  - `POST /reputation/agents/:id/recalculate` - Trigger score recalculation
- **Features**:
  - Confidence factor for low review counts
  - Automatic score updates
  - Top agent rankings
  - OpenAPI documentation

#### Registry Federation (Foundation)
- **Database Schema**:
  - `federated_registries` table - External registry connections
  - `federated_agents` table - Cached agents from other registries
- **Federation Service**:
  - `syncFromRegistry()` - Pull agents from remote registry
  - `syncAllRegistries()` - Sync from all active registries
  - `searchFederated()` - Search across federated agents
  - Automatic synchronization support
  - Trust verification system
- **Features**:
  - Multi-registry agent discovery
  - Configurable sync intervals
  - Trust-based verification
  - API key authentication for remote registries
  - Agent data caching

### Enhanced
- Agent model relations (reviews, reputation score)
- Metrics contribute to reputation
- Automatic reputation updates

---

## [0.5.0] - 2026-02-15

### Added

#### Comprehensive Integration Tests
- **Full E2E Test Suite** - Complete integration test coverage
  - Health check tests
  - Agent CRUD operations
  - Search and filtering
  - API key authentication
  - Admin API (API keys, webhooks)
  - Metrics reporting
  - Rate limiting verification
  - Swagger documentation endpoints
- **Test Infrastructure**:
  - Supertest for HTTP testing
  - Test database configuration (.env.test)
  - 200+ test assertions
  - Proper setup/teardown

#### Metrics & Monitoring System
- **Statistics Endpoint** (`/metrics/stats`)
  - Total agents, API keys, webhooks
  - Agents by skill distribution
  - Active resource counts
- **Top Agents Endpoint** (`/metrics/top-agents`)
  - Ranked by performance metrics
  - Configurable limit
- **Prometheus Integration** (`/metrics/prometheus`)
  - Prometheus text format export
  - Gauges and counters
  - Average performance metrics
- **Monitoring Guide** (`docs/MONITORING.md`)
  - Grafana + Prometheus setup
  - Docker Compose configuration
  - Cloud monitoring (AWS/GCP/Datadog)
  - Alerting rules
  - Custom dashboard examples
  - Health check strategies

### Dependencies
- Added supertest (testing)
- Added @types/supertest

---

## [0.4.0] - 2026-02-15

### Added

#### OpenAPI/Swagger Documentation
- **Automatic API Documentation** - `/api-docs` endpoint
  - Interactive Swagger UI
  - Complete API specification
  - Schema definitions for all models
  - Request/response examples
  - Authentication documentation
- **Swagger JSON** - `/swagger.json` endpoint for programmatic access
- **Comprehensive API Docs** - All endpoints documented with JSDoc

#### WebHook Notification System
- **Event-based Notifications** - Real-time event notifications
  - `agent.registered`
  - `agent.updated`
  - `agent.deleted`
  - `agent.metrics_reported`
- **Webhook Management**:
  - Database schema for webhooks
  - Service layer for webhook delivery
  - HMAC signature verification
  - Timeout protection (5 seconds)
  - Fire-and-forget delivery (non-blocking)
  - Last triggered timestamp tracking
- **Security**: Optional HMAC-SHA256 signature verification

### Documentation
- Removed Discord link from README (as requested)

---

## [0.3.1] - 2026-02-15

### Added
- **FEATURES.md** - Complete feature overview and status tracking
- **docs/API_KEYS.md** - Comprehensive API key usage guide

### Security
- **Admin API Protection** - Master key authentication for /admin endpoints
  - Set `ADMIN_KEY` environment variable to protect admin routes
  - Graceful fallback for development (warns if unprotected)
- **Python SDK Environment Variable Support** - `AIP_API_KEY` auto-detection

### Improved
- **Python SDK API Key Support**
  - Constructor accepts `api_key` parameter
  - Automatically reads from `AIP_API_KEY` environment variable
- **TypeScript SDK Major Enhancements**
  - Automatic retry logic with exponential backoff
  - Timeout support (configurable)
  - `searchAll()` - Auto-pagination for complete results
  - `healthCheck()` - Health status endpoint
  - Environment variable support (`AIP_API_KEY`)
  - Options-based constructor for better configuration
  - Backwards compatible with old constructor signature

### Documentation
- Complete API key usage guide with examples
- Security best practices
- CI/CD integration patterns
- Troubleshooting guide

---

## [0.3.0] - 2026-02-15

### Added

#### Authentication & Security
- **API Key System** - Complete API key management
- **Admin API** - Endpoints for creating/managing API keys
  - `POST /admin/api-keys` - Create API key
  - `GET /admin/api-keys` - List all keys
  - `GET /admin/api-keys/:id` - Get specific key
  - `PATCH /admin/api-keys/:id` - Update key
  - `DELETE /admin/api-keys/:id` - Delete key
  - `POST /admin/api-keys/:id/revoke` - Revoke key
- **Permission System** - Granular read/write/delete permissions
- **Optional Authentication** - Can be disabled for development (`REQUIRE_API_KEY=false`)
- **API Key Expiration** - Support for expiring keys
- **Rate Limiting per Key** - Custom rate limits per API key

#### CLI Tools
- **API Key Management Commands**:
  - `aip keys create` - Create new API key
  - `aip keys list` - List all keys
  - `aip keys revoke` - Revoke a key
  - `aip keys delete` - Delete a key
- **Enhanced Security** - Support for authenticated requests

#### Development Experience
- **Improved Docker Compose**:
  - Development profile with hot reload (`docker-compose --profile dev up`)
  - pgAdmin for database management (`docker-compose --profile tools up`)
  - Environment variable configuration
  - Network isolation
- **Development Dockerfile** - Optimized for local development
- **Integration Test Suite** - Test templates for E2E testing

#### Examples
- **LangChain Integration** - Complete example of registering LangChain agents
- **Integration Patterns** - Documentation for framework integration

### Changed
- **Authentication Middleware** - Applied to all write operations (register/update/delete/metrics)
- **Environment Configuration** - Added `REQUIRE_API_KEY`, `LOG_LEVEL` environment variables
- **Docker Compose** - Restructured for better dev/prod separation

### Security
- **API Key Storage** - Secure random generation (base64url, 32 bytes)
- **Permission Checks** - Enforced at middleware level
- **Key Masking** - Keys only shown once at creation

---

## [Unreleased]

### Planned
- Agent reputation system
- Distributed registry federation
- Proof of work verification
- WebSocket support for real-time updates
- GraphQL API
- Browser extension for registry exploration
- OAuth2/JWT authentication
