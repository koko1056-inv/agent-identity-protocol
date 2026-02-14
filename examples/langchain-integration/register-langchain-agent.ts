/**
 * Example: Register a LangChain agent in AIP Registry
 */

import { AIPClient } from '../../sdk/typescript/src';

async function main() {
  const client = new AIPClient('http://localhost:3000');

  // Example: Register a LangChain-based research agent
  const agent = {
    id: 'did:aip:langchain-research-agent',
    name: 'LangChain Research Assistant',
    version: '1.0.0',
    description: 'An AI research assistant powered by LangChain, capable of multi-step reasoning and web search',
    capabilities: [
      {
        skill: 'research',
        confidence: 0.92,
        parameters: {
          max_sources: 10,
          citation_format: 'APA',
        },
      },
      {
        skill: 'text-generation',
        confidence: 0.88,
      },
      {
        skill: 'summarization',
        confidence: 0.90,
        parameters: {
          max_length: 500,
        },
      },
      {
        skill: 'qa',
        confidence: 0.85,
      },
    ],
    endpoints: {
      api: 'https://api.example.com/langchain-agent',
      health: 'https://api.example.com/health',
      docs: 'https://docs.example.com/langchain-agent',
    },
    pricing: {
      model: 'per-task',
      base_price: 0.05,
      currency: 'USD',
    },
    metadata: {
      framework: 'LangChain',
      model: 'gpt-4',
      tools: ['serpapi', 'wikipedia', 'arxiv'],
      language: 'TypeScript',
      license: 'MIT',
    },
  };

  try {
    const result = await client.register(agent);
    console.log('✅ Agent registered successfully!');
    console.log('ID:', result.id);
    console.log('Registered at:', result.registered_at);

    // Demonstrate search
    console.log('\n🔍 Searching for research agents...');
    const researchers = await client.search('research', 0.85);
    console.log(`Found ${researchers.length} research agent(s)`);

    researchers.forEach((a) => {
      console.log(`  - ${a.name} (confidence: ${a.capabilities.find((c) => c.skill === 'research')?.confidence})`);
    });
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

main();
