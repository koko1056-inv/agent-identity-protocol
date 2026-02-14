# Agent Identity Protocol (AIP)

> A decentralized identity and discovery protocol for AI agents

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-SDK-blue)](./sdk/typescript)
[![Protocol Version](https://img.shields.io/badge/Protocol-v0.1.0-green)](./SPECIFICATION.md)

## Why AIP?

AI agents are proliferating across ecosystems—Clawdbot, LangChain, AutoGPT, custom implementations—but there's no standard way to:

- 🔍 **Discover** what an agent can do
- ✅ **Verify** an agent's capabilities objectively
- 📊 **Compare** agents based on performance data
- 🤝 **Enable** seamless agent-to-agent collaboration

**AIP solves this.**

## What is AIP?

A lightweight, open protocol for AI agents to:

1. **Declare** their capabilities (skills, APIs, pricing)
2. **Prove** their performance (metrics, verifiable work samples)
3. **Discover** other agents (search, match, collaborate)

Think of it as:

- **LinkedIn** (professional profiles) + 
- **GitHub** (proof of work) + 
- **Yellow Pages** (discoverability)

...but for AI agents, without the platform lock-in.

## Core Principles

- 🌐 **Open Standard** - RFC-style specification, community-driven
- 🔓 **No Lock-in** - Agents own their data, portable across platforms
- 🏗️ **Self-hostable** - Run your own registry, no central authority required
- 📈 **Data-driven** - Objective metrics over subjective ratings
- 🔗 **Interoperable** - Works with any agent framework

## Quick Start

### 1. Install SDK

```bash
npm install agent-identity-protocol
# or
pip install agent-identity-protocol  # Coming soon
```

### 2. Register Your Agent

```typescript
import { AIPClient, createAgent } from 'agent-identity-protocol';

const client = new AIPClient('https://registry.aip.dev');

const myAgent = createAgent({
  id: 'did:aip:my-agent',
  name: 'ContentBot',
  capabilities: [
    { skill: 'text-generation', confidence: 0.95 },
    { skill: 'translation', confidence: 0.88 }
  ],
  endpoints: {
    api: 'https://mybot.example.com/api/v1'
  }
});

await client.register(myAgent);
console.log('✅ Agent registered!');
```

### 3. Discover & Collaborate

```typescript
// Find agents by skill
const writers = await client.search('text-generation', 0.9);
console.log(`Found ${writers.length} high-quality writers`);

// Get detailed profile
const agent = await client.getAgent('did:aip:content-writer-pro');
console.log(`Response time: ${agent.metrics.avg_response_time_ms}ms`);
console.log(`Success rate: ${agent.metrics.success_rate * 100}%`);
```

### 4. Report Performance

```typescript
await client.reportMetrics('did:aip:my-agent', {
  tasks_completed: 150,
  avg_response_time_ms: 800,
  success_rate: 0.99,
  uptime_30d: 0.998
});
```

## Run Your Own Registry

```bash
git clone https://github.com/agent-identity-protocol/aip
cd aip/reference-impl/server
docker-compose up
```

Your private registry is now running at `http://localhost:3000`

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Agent Ecosystem                       │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌─────────┐ │
│  │ Clawdbot │  │LangChain │  │ AutoGPT  │  │ Custom  │ │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬────┘ │
│       │             │             │             │       │
│       └─────────────┴─────────────┴─────────────┘       │
│                         │                                │
│                         ▼                                │
│              ┌──────────────────────┐                   │
│              │   AIP Protocol       │                   │
│              │  (Open Standard)     │                   │
│              └──────────┬───────────┘                   │
│                         │                                │
│       ┌─────────────────┼─────────────────┐            │
│       ▼                 ▼                 ▼             │
│  ┌─────────┐      ┌─────────┐      ┌─────────┐        │
│  │Registry │      │Registry │      │Registry │         │
│  │   #1    │      │   #2    │      │   #3    │         │
│  │(Public) │      │(Private)│      │(Federat)│         │
│  └─────────┘      └─────────┘      └─────────┘         │
└─────────────────────────────────────────────────────────┘
```

**Key**: No single registry owns the protocol. Run one, run many, federate.

## Features

| Feature | Status | Description |
|---------|--------|-------------|
| Core Protocol | ✅ | Agent profile schema, API spec |
| TypeScript SDK | ✅ | Full-featured client library |
| Python SDK | 🚧 | In progress |
| Reference Server | ✅ | Self-hostable registry |
| CLI Tools | ✅ | Command-line utilities |
| Verifiable Credentials | 🚧 | W3C DID integration |
| IPFS Proof-of-Work | 📋 | Planned |
| Federation | 📋 | Cross-registry sync |

## Use Cases

### 1. **Agent Marketplaces**
Let buyers discover and compare agents objectively
```typescript
const topAgents = await client.search('data-analysis', 0.9);
// Sort by metrics, not reviews
```

### 2. **Multi-agent Systems**
Agents dynamically find collaborators
```typescript
const visualizer = await findBestMatch({ skill: 'data-visualization', budget: 10 });
await myAgent.delegate(task, visualizer);
```

### 3. **Agent Orchestration**
Select the optimal agent for each subtask
```typescript
const pipeline = [
  await findAgent('web-scraping'),
  await findAgent('data-cleaning'),
  await findAgent('sentiment-analysis')
];
```

### 4. **Reputation Without Platforms**
Build trust through verifiable performance data
```typescript
// No 5-star ratings, just facts
agent.metrics.success_rate // 0.98
agent.proof_of_work // IPFS hash of completed tasks
```

## Project Structure

```
agent-identity-protocol/
├── spec/                   # Detailed specifications
│   ├── 01-agent-profile.md
│   ├── 02-metrics.md
│   ├── 03-proof-of-work.md
│   └── 04-api-endpoints.md
├── sdk/                    # Client SDKs
│   ├── typescript/
│   └── python/
├── reference-impl/         # Reference implementations
│   ├── server/            # Registry server
│   ├── client/            # Web UI
│   └── cli/               # Command-line tools
├── examples/               # Usage examples
└── tools/                  # Dev tools
```

## Roadmap

### Phase 0: Foundation (Week 1-2) ✅
- [x] Core protocol specification
- [x] TypeScript SDK
- [x] Reference server implementation
- [x] Basic examples

### Phase 1: Adoption (Week 3-8)
- [ ] Python SDK
- [ ] CLI tools (`aip register`, `aip search`)
- [ ] Clawdbot integration example
- [ ] LangChain integration example
- [ ] Documentation site

### Phase 2: Trust Layer (Week 9-16)
- [ ] W3C Verifiable Credentials
- [ ] IPFS proof-of-work storage
- [ ] Cryptographic signatures for metrics
- [ ] Agent reputation scoring algorithms

### Phase 3: Federation (Week 17-24)
- [ ] Cross-registry synchronization
- [ ] Registry discovery protocol
- [ ] Distributed query optimization

## Contributing

We welcome contributions! See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

**Areas we need help**:
- 🐍 Python SDK
- 🦀 Rust SDK
- 📚 Documentation
- 🧪 Testing & validation
- 🌐 Integrations (LangChain, AutoGPT, etc.)

## Community

- **GitHub Discussions**: Ask questions, share ideas
- **Monthly Calls**: First Tuesday, 6pm UTC

## Specification

See [SPECIFICATION.md](SPECIFICATION.md) for the complete protocol specification.

## License

MIT License - See [LICENSE](LICENSE) for details

---

**Built with 🔥 by the AI agent community**

*"The best way to predict the future is to standardize it."*
