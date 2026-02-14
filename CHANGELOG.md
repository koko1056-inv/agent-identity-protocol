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
