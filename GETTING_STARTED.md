# Getting Started with Agent Identity Protocol (AIP)

This guide will help you get started with AIP in **under 10 minutes**.

## What You'll Build

By the end of this guide, you'll have:
1. ✅ Registered your first agent
2. ✅ Searched for other agents by skill
3. ✅ Reported performance metrics

## Prerequisites

- **Node.js 18+** or **Python 3.9+** (we'll use TypeScript for this guide)
- Basic understanding of AI agents

## Step 1: Install the SDK

```bash
npm install agent-identity-protocol
# or
yarn add agent-identity-protocol
```

## Step 2: Create Your Agent Profile

Create a new file `my-agent.ts`:

```typescript
import { AIPClient, createAgent, createCapability } from 'agent-identity-protocol';

// Create a client pointing to a registry
const client = new AIPClient('https://registry.aip.dev');

// Define your agent
const myAgent = createAgent({
  id: 'did:aip:my-first-bot',
  name: 'MyFirstBot',
  description: 'A simple text generation agent',
  capabilities: [
    createCapability('text-generation', 0.9, {
      input_formats: ['text'],
      output_formats: ['markdown'],
      languages: ['en'],
    }),
  ],
  endpoints: {
    api: 'https://mybot.example.com/api',
  },
  pricing: {
    model: 'free',
  },
});

// Register it
async function main() {
  const result = await client.register(myAgent);
  console.log('✅ Registered!', result);
}

main();
```

Run it:
```bash
npx ts-node my-agent.ts
```

**Output**:
```
✅ Registered! { id: 'did:aip:my-first-bot', registered_at: '2025-02-15T00:00:00Z' }
```

## Step 3: Search for Agents

Add this to your script:

```typescript
// Search for text generators
const agents = await client.search('text-generation', 0.8);

console.log(`Found ${agents.length} agents:`);
agents.forEach((agent) => {
  console.log(`- ${agent.name} (confidence: ${agent.capabilities[0].confidence})`);
});
```

**Output**:
```
Found 3 agents:
- MyFirstBot (confidence: 0.9)
- ContentWriterPro (confidence: 0.95)
- GPT-4-Agent (confidence: 0.98)
```

## Step 4: Report Metrics

After your agent completes some tasks, report metrics:

```typescript
await client.reportMetrics('did:aip:my-first-bot', {
  tasks_completed: 10,
  avg_response_time_ms: 1500,
  success_rate: 0.95,
  uptime_30d: 1.0,
});

console.log('✅ Metrics reported!');
```

## Step 5: Retrieve a Profile

```typescript
const profile = await client.getAgent('did:aip:my-first-bot');

console.log('Agent:', profile.name);
console.log('Version:', profile.version);
console.log('Tasks completed:', profile.metrics?.tasks_completed);
```

**Output**:
```
Agent: MyFirstBot
Version: 1.0.0
Tasks completed: 10
```

---

## Running Your Own Registry

Don't want to use a public registry? Run your own in **3 commands**:

```bash
git clone https://github.com/agent-identity-protocol/aip
cd aip/reference-impl/server
docker-compose up
```

Your registry is now at `http://localhost:3000`.

Update your client:
```typescript
const client = new AIPClient('http://localhost:3000');
```

---

## Integration with Clawdbot

If you're using Clawdbot, register all your skills automatically:

```bash
cd agent-identity-protocol/examples/clawdbot-integration
AIP_REGISTRY_URL=http://localhost:3000 ts-node register-skills.ts
```

This will:
- Scan your `~/clawd/skills` directory
- Parse each `SKILL.md`
- Register each skill as an AIP agent

---

## Next Steps

### For Agent Developers
- [Read the full specification](./SPECIFICATION.md)
- [Explore examples](./examples/)
- [Contribute a new SDK](./CONTRIBUTING.md)

### For Platform Builders
- [Implement the registry API](./spec/04-api-endpoints.md)
- [Set up federation](./spec/05-federation.md) (coming soon)
- [Add verification](./spec/03-proof-of-work.md)

### For Researchers
- [Study the metrics design](./spec/02-metrics.md)
- [Contribute to the skill taxonomy](./SPECIFICATION.md#appendix-a)
- [Propose protocol improvements](https://github.com/agent-identity-protocol/aip/discussions)

---

## Troubleshooting

### "Connection refused"
- Make sure the registry is running
- Check the URL (http vs https)

### "Agent already exists"
- Use a unique `id` for each agent
- Or update the existing agent with `client.update()`

### "Invalid profile"
- Ensure all required fields are present: `id`, `name`, `version`, `capabilities`
- Check that `confidence` is between 0.0 and 1.0

---

## Community

- **GitHub**: [agent-identity-protocol/aip](https://github.com/agent-identity-protocol/aip)
- **Discussions**: Ask questions, share ideas
- **Discord**: Coming soon
- **Monthly Calls**: First Tuesday, 6pm UTC

---

**Welcome to the AIP community! 🚀**
