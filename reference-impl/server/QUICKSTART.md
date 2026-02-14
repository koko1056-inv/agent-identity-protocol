# Quick Start Guide

Get the AIP Registry running in **under 5 minutes**.

## Step 1: Start the Server

```bash
cd reference-impl/server
docker-compose up
```

Wait for:
```
✅ Database connected
🚀 AIP Registry Server running on http://localhost:3000
```

## Step 2: Test the Registry

### Check Health
```bash
curl http://localhost:3000/health
```

Expected response:
```json
{
  "status": "healthy",
  "timestamp": "2025-02-15T00:00:00Z",
  "database": "connected"
}
```

### Register Your First Agent

```bash
curl -X POST http://localhost:3000/agents \
  -H "Content-Type: application/json" \
  -d '{
    "id": "did:aip:my-first-agent",
    "name": "MyFirstAgent",
    "version": "1.0.0",
    "capabilities": [
      {
        "skill": "text-generation",
        "confidence": 0.9
      }
    ],
    "description": "My first AIP agent"
  }'
```

Expected response:
```json
{
  "id": "did:aip:my-first-agent",
  "registered_at": "2025-02-15T00:00:00Z"
}
```

### Search for Agents

```bash
curl "http://localhost:3000/agents?skill=text-generation&min_confidence=0.8"
```

Expected response:
```json
{
  "results": [
    {
      "id": "did:aip:my-first-agent",
      "name": "MyFirstAgent",
      "version": "1.0.0",
      "capabilities": [
        {
          "skill": "text-generation",
          "confidence": 0.9
        }
      ],
      "description": "My first AIP agent"
    }
  ],
  "total": 1,
  "page": 1,
  "per_page": 20
}
```

### Get Agent Profile

```bash
curl http://localhost:3000/agents/did:aip:my-first-agent
```

### Report Metrics

```bash
curl -X POST http://localhost:3000/agents/did:aip:my-first-agent/metrics \
  -H "Content-Type: application/json" \
  -d '{
    "tasks_completed": 50,
    "avg_response_time_ms": 1200,
    "success_rate": 0.98,
    "uptime_30d": 0.995
  }'
```

## Step 3: Use the TypeScript SDK

```bash
cd ../../sdk/typescript
npm install
```

Create `test.ts`:
```typescript
import { AIPClient, createAgent, createCapability } from 'agent-identity-protocol';

const client = new AIPClient('http://localhost:3000');

const myAgent = createAgent({
  id: 'did:aip:sdk-test-agent',
  name: 'SDK Test Agent',
  capabilities: [
    createCapability('text-generation', 0.95)
  ]
});

await client.register(myAgent);
console.log('✅ Registered!');

const agents = await client.search('text-generation', 0.9);
console.log(`Found ${agents.length} agents`);
```

Run:
```bash
npx tsx test.ts
```

## Next Steps

- Read [README.md](./README.md) for full API documentation
- Explore [examples](../../examples/) for integration examples
- Check [SPECIFICATION.md](../../SPECIFICATION.md) for protocol details

## Troubleshooting

### Port 3000 already in use
```bash
# Change port in docker-compose.yml
ports:
  - "3001:3000"  # Use port 3001 instead
```

### Database connection failed
```bash
# Check if PostgreSQL is running
docker ps | grep postgres

# View logs
docker-compose logs postgres
```

### Reset database
```bash
docker-compose down -v  # Remove volumes
docker-compose up       # Start fresh
```

---

**That's it! You now have a working AIP Registry.** 🎉
