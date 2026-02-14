# API Key Authentication Guide

Complete guide to using API keys with AIP Registry.

## 🔑 What Are API Keys?

API keys are secure tokens that grant access to write operations (register, update, delete agents). They provide:

- **Fine-grained permissions** - Control read/write/delete access
- **Rate limiting** - Set custom rate limits per key
- **Auditability** - Track which key performed which action
- **Expiration** - Automatic key expiration for security

---

## 🚀 Quick Start

### 1. Enable API Key Protection (Optional)

API key authentication is **disabled by default** for easy development. To enable it:

```bash
# Edit .env file
echo "REQUIRE_API_KEY=true" >> .env

# Restart server
docker-compose restart server
```

### 2. Protect Admin API

**⚠️ Highly Recommended**: Set an admin key to protect the `/admin` endpoints:

```bash
# Generate a secure random key
ADMIN_KEY=$(openssl rand -base64 32)

# Add to .env
echo "ADMIN_KEY=$ADMIN_KEY" >> .env

# Restart server
docker-compose restart server

# Save the key securely - you'll need it to create API keys!
echo $ADMIN_KEY > ~/.aip-admin-key
chmod 600 ~/.aip-admin-key
```

---

## 📝 Creating API Keys

### Using CLI

```bash
# Set admin key in config
aip config set admin_key $(cat ~/.aip-admin-key)

# Create a read-only key
aip keys create --name "read-only-bot"

# Create a write-enabled key
aip keys create --name "my-app" --write

# Create a full-access key with custom rate limit
aip keys create --name "admin-app" --write --delete --rate-limit 1000

# Create a temporary key (expires in 30 days)
aip keys create --name "temp-key" --write --expires "2026-03-15T00:00:00Z"
```

### Using cURL

```bash
# Create API key via Admin API
curl -X POST http://localhost:3000/admin/api-keys \
  -H "Authorization: Bearer YOUR_ADMIN_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "my-app",
    "description": "Production API key for MyApp",
    "permissions": {
      "read": true,
      "write": true,
      "delete": false
    },
    "rateLimit": 100
  }'
```

**⚠️ Important**: The actual API key is shown **only once** at creation. Save it securely!

Example response:
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "key": "aip_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
  "name": "my-app",
  "permissions": {
    "read": true,
    "write": true,
    "delete": false
  },
  "createdAt": "2026-02-15T02:00:00.000Z"
}
```

---

## 🔧 Using API Keys

### CLI

```bash
# Method 1: Save in config (recommended)
aip config set api_key aip_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Method 2: Use environment variable
export AIP_API_KEY=aip_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Method 3: Pass directly (not recommended - exposes in shell history)
aip register agent.yaml --api-key aip_xxxxxxxxxx...

# Now all write operations will use the API key
aip register my-agent.yaml
aip delete did:aip:old-agent
```

### Python SDK

```python
from aip import AIPClient

# Method 1: Pass API key directly
client = AIPClient('http://localhost:3000', api_key='aip_xxxxxx...')

# Method 2: Use environment variable (recommended)
# Set AIP_API_KEY=aip_xxxxxx... in your environment
client = AIPClient('http://localhost:3000')

# Register agent (requires write permission)
agent = create_agent(
    id='did:aip:my-agent',
    name='MyAgent',
    capabilities=[create_capability('text-generation', 0.9)]
)

client.register(agent)
```

### TypeScript SDK

```typescript
import { AIPClient } from 'agent-identity-protocol';

// Method 1: Pass API key directly
const client = new AIPClient(
  'http://localhost:3000',
  'aip_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'
);

// Method 2: Use environment variable
// Set AIP_API_KEY in .env
const client = new AIPClient(
  'http://localhost:3000',
  process.env.AIP_API_KEY
);

// Register agent
await client.register({
  id: 'did:aip:my-agent',
  name: 'MyAgent',
  version: '1.0.0',
  capabilities: [
    { skill: 'text-generation', confidence: 0.9 }
  ]
});
```

### cURL

```bash
# Register an agent with API key
curl -X POST http://localhost:3000/agents \
  -H "Authorization: Bearer aip_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" \
  -H "Content-Type: application/json" \
  -d @agent.json
```

---

## 🔒 Permission Levels

### Read Permission
- ✅ `GET /agents` (search)
- ✅ `GET /agents/:id` (get agent)
- ✅ `GET /health`

### Write Permission
- ✅ `POST /agents` (register)
- ✅ `PUT /agents/:id` (update)
- ✅ `POST /agents/:id/metrics` (report metrics)
- ✅ Read permission operations

### Delete Permission
- ✅ `DELETE /agents/:id` (delete)
- ✅ Write permission operations
- ✅ Read permission operations

---

## 🛡️ Security Best Practices

### 1. Never Commit API Keys
```bash
# Add to .gitignore
echo ".env" >> .gitignore
echo "*.key" >> .gitignore
```

### 2. Use Environment Variables
```bash
# Instead of hardcoding
export AIP_API_KEY=aip_xxxxxx...
export AIP_ADMIN_KEY=your-admin-key
```

### 3. Rotate Keys Regularly
```bash
# Create new key
aip keys create --name "my-app-v2" --write

# Update applications to use new key
# ...

# Revoke old key
aip keys revoke <old-key-id>
```

### 4. Use Least Privilege
```bash
# For read-only applications, don't grant write permission
aip keys create --name "read-only-bot"  # No --write flag
```

### 5. Set Expiration for Temporary Access
```bash
# Expires after 7 days
aip keys create --name "temp-access" --write \
  --expires "$(date -u -v+7d +%Y-%m-%dT%H:%M:%SZ)"
```

### 6. Monitor Key Usage
```bash
# Check when keys were last used
aip keys list

# Look for suspicious activity in logs
docker logs aip-server | grep "API key"
```

---

## 📊 Managing API Keys

### List All Keys
```bash
aip keys list
```

### Get Key Details
```bash
# Using CLI
aip keys get <key-id>

# Using API
curl http://localhost:3000/admin/api-keys/<key-id> \
  -H "Authorization: Bearer YOUR_ADMIN_KEY"
```

### Revoke a Key (Disable)
```bash
# Revoke immediately but keep in database
aip keys revoke <key-id>
```

### Delete a Key (Permanent)
```bash
# Permanently delete (cannot be undone)
aip keys delete <key-id>
```

### Update Key Permissions
```bash
# Using API
curl -X PATCH http://localhost:3000/admin/api-keys/<key-id> \
  -H "Authorization: Bearer YOUR_ADMIN_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "permissions": {
      "read": true,
      "write": false,
      "delete": false
    }
  }'
```

---

## 🚨 Troubleshooting

### "Unauthorized" Error

**Problem**: Getting 401 Unauthorized when making requests.

**Solution**:
1. Check if API key authentication is enabled (`REQUIRE_API_KEY=true`)
2. Verify you're passing the API key correctly:
   ```bash
   # Check header format
   curl -H "Authorization: Bearer YOUR_KEY" ...
   ```
3. Ensure the key hasn't expired:
   ```bash
   aip keys list
   ```

### "Forbidden" Error

**Problem**: Getting 403 Forbidden when trying to register/update agents.

**Solution**: Your API key doesn't have write permission. Create a new key with `--write` flag or use a key with appropriate permissions.

### "Invalid admin credentials"

**Problem**: Cannot create API keys.

**Solution**: 
1. Set `ADMIN_KEY` in `.env`
2. Pass admin key when creating API keys:
   ```bash
   export AIP_ADMIN_KEY=your-admin-key
   aip keys create --name "my-key" --write
   ```

### Key Not Working After Revocation

**Problem**: Revoked key still appears to work.

**Solution**: Restart the server to clear any in-memory caches:
```bash
docker-compose restart server
```

---

## 🎯 Common Workflows

### Development Setup (No Authentication)
```bash
# Don't set REQUIRE_API_KEY or ADMIN_KEY
# Everything is open - use only for local development!
docker-compose up
```

### Production Setup (Secured)
```bash
# 1. Set admin key
ADMIN_KEY=$(openssl rand -base64 32)
echo "ADMIN_KEY=$ADMIN_KEY" >> .env

# 2. Enable API key requirement
echo "REQUIRE_API_KEY=true" >> .env

# 3. Restart
docker-compose restart server

# 4. Create production API key
aip config set admin_key $ADMIN_KEY
aip keys create --name "production-app" --write --rate-limit 500

# 5. Secure the admin key
echo $ADMIN_KEY > ~/.aip-admin-key
chmod 600 ~/.aip-admin-key
unset ADMIN_KEY
```

### CI/CD Integration
```bash
# 1. Create dedicated CI key
aip keys create --name "ci-pipeline" --write --rate-limit 200

# 2. Add to GitHub Secrets / GitLab CI Variables
# AIP_API_KEY=aip_xxxxxxxxxx...

# 3. Use in pipeline
# .github/workflows/deploy.yml
env:
  AIP_API_KEY: ${{ secrets.AIP_API_KEY }}
run: |
  aip register agents/my-agent.yaml
```

---

## 📖 API Reference

See [SPECIFICATION.md](../SPECIFICATION.md) for complete API documentation.

### Admin Endpoints

- `POST /admin/api-keys` - Create API key
- `GET /admin/api-keys` - List all keys
- `GET /admin/api-keys/:id` - Get specific key
- `PATCH /admin/api-keys/:id` - Update key
- `DELETE /admin/api-keys/:id` - Delete key
- `POST /admin/api-keys/:id/revoke` - Revoke key

All admin endpoints require `Authorization: Bearer YOUR_ADMIN_KEY` header.
