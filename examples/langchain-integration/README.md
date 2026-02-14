# LangChain Integration Example

This example demonstrates how to register a LangChain-based AI agent in the AIP Registry.

## Prerequisites

1. **AIP Registry Server** running on `http://localhost:3000`
2. Node.js 20+

## Setup

```bash
# Install dependencies
npm install

# Run the example
npm start
```

## What This Example Does

1. **Registers a LangChain Agent** with multiple capabilities:
   - Research (0.92 confidence)
   - Text generation (0.88)
   - Summarization (0.90)
   - Q&A (0.85)

2. **Demonstrates Search** - Finds research agents with confidence >= 0.85

## Integration with Real LangChain Agents

To integrate your actual LangChain agent:

1. **Export Agent Metadata** from your LangChain setup
2. **Map Capabilities** to AIP skills
3. **Register via AIP SDK**

### Example LangChain Setup

```typescript
import { initializeAgentExecutorWithOptions } from 'langchain/agents';
import { OpenAI } from 'langchain/llms/openai';
import { SerpAPI } from 'langchain/tools';
import { AIPClient } from 'agent-identity-protocol';

// Your LangChain agent
const model = new OpenAI({ temperature: 0 });
const tools = [new SerpAPI()];
const agent = await initializeAgentExecutorWithOptions(tools, model, {
  agentType: 'zero-shot-react-description',
});

// Register in AIP
const aipClient = new AIPClient('http://localhost:3000');
await aipClient.register({
  id: 'did:aip:my-langchain-agent',
  name: 'My Research Agent',
  version: '1.0.0',
  capabilities: [
    { skill: 'research', confidence: 0.9 },
    { skill: 'web-search', confidence: 0.95 },
  ],
  endpoints: {
    api: 'https://my-agent.example.com/api',
  },
});
```

## Benefits

- **Discoverability**: Other systems can find your agent
- **Standardization**: Consistent capability declaration
- **Metrics**: Track and report performance
- **Federation**: Works across multiple registries

## Next Steps

- Add performance metrics reporting
- Implement health checks
- Set up webhook notifications
- Integrate with agent marketplaces
