# AIP Quick Start Guide

Get your AIP registry up and running in 5 minutes.

## 🚀 Quick Start with Docker

### 1. Start the Registry

```bash
# Clone the repository
git clone https://github.com/koko1056-inv/agent-identity-protocol.git
cd agent-identity-protocol/reference-impl/server

# Start PostgreSQL + Registry Server
docker-compose up -d

# Check health
curl http://localhost:3000/health
```

✅ Your registry is now running on `http://localhost:3000`!

### 2. Register Your First Agent

```bash
# Install CLI tools
pip install aip-cli

# Create an agent profile
cat > my-agent.yaml <<EOF
id: did:aip:my-first-agent
name: My First Agent
version: 1.0.0
capabilities:
  - skill: text-generation
    confidence: 0.9
  - skill: summarization
    confidence: 0.85
description: A simple AI agent for text tasks
EOF

# Register the agent
aip register my-agent.yaml
```

### 3. Search for Agents

```bash
# Find all text-generation agents
aip search text-generation

# Find high-quality agents (confidence >= 0.9)
aip search text-generation --min-confidence 0.9

# Get detailed info
aip get did:aip:my-first-agent
```

---

## 🔐 Enable Authentication (Optional)

### 1. Create an API Key

```bash
# Create a write-enabled API key
aip keys create --name "my-app" --write

# Save the key - it won't be shown again!
# Example output: aip_xxxxxxxxxxxxxxxxxxx
```

### 2. Enable Authentication

```bash
# Edit .env file
echo "REQUIRE_API_KEY=true" >> .env

# Restart server
docker-compose restart server
```

### 3. Use API Key

```bash
# Configure CLI with API key
aip config set api_key aip_xxxxxxxxxxxxxxxxxxx

# Or use directly in requests
curl -H "Authorization: Bearer aip_xxxxxxxxxxxxxxxxxxx" \
  -X POST http://localhost:3000/agents \
  -H "Content-Type: application/json" \
  -d @my-agent.json
```

---

## 🔧 Development Mode

For active development with hot reload:

```bash
# Start in dev mode
docker-compose --profile dev up

# Server runs on port 3001 with auto-reload
# Code changes are reflected immediately
```

### With Database Admin (pgAdmin)

```bash
# Start with database tools
docker-compose --profile tools up

# Access pgAdmin at http://localhost:5050
# Email: admin@aip.dev
# Password: admin
```

---

## 📚 Using the SDK

### TypeScript

```typescript
import { AIPClient } from 'agent-identity-protocol';

const client = new AIPClient('http://localhost:3000');

// Register an agent
await client.register({
  id: 'did:aip:my-agent',
  name: 'MyAgent',
  version: '1.0.0',
  capabilities: [
    { skill: 'text-generation', confidence: 0.9 }
  ]
});

// Search
const agents = await client.search('text-generation', 0.8);
console.log(`Found ${agents.length} agents`);
```

### Python

```python
from aip import AIPClient, create_agent, create_capability

client = AIPClient('http://localhost:3000')

# Register an agent
agent = create_agent(
    id='did:aip:my-agent',
    name='MyAgent',
    capabilities=[
        create_capability('text-generation', 0.9)
    ]
)

client.register(agent)

# Search
agents = client.search('text-generation', min_confidence=0.8)
print(f"Found {len(agents)} agents")
```

---

## 🧪 Run Tests

```bash
cd reference-impl/server

# Install dependencies
npm install

# Run tests
npm test

# Run with coverage
npm run test:coverage
```

---

## 📖 Next Steps

- **[Full Documentation](./README.md)** - Complete feature guide
- **[API Reference](./SPECIFICATION.md)** - Protocol specification
- **[Examples](./examples/)** - Integration examples
- **[Contributing](./CONTRIBUTING.md)** - Join development

---

## 🆘 Troubleshooting

### Port Already in Use

```bash
# Change port in docker-compose.yml or .env
PORT=3001 docker-compose up
```

### Database Connection Failed

```bash
# Check PostgreSQL is running
docker ps | grep aip-postgres

# View logs
docker logs aip-postgres

# Reset database
docker-compose down -v
docker-compose up -d
```

### Build Errors

```bash
# Clean and rebuild
docker-compose down
docker-compose build --no-cache
docker-compose up
```

---

**Ready to build the future of AI agent identity? 🚀**
