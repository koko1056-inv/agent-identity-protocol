/**
 * Basic Agent Example
 * 
 * This example demonstrates how to:
 * 1. Create an agent profile
 * 2. Register it with a registry
 * 3. Search for other agents
 * 4. Report performance metrics
 */

import { AIPClient, createAgent, createCapability } from 'agent-identity-protocol';

async function main() {
  // 1. Create a client (use public registry or localhost)
  const registryUrl = process.env.AIP_REGISTRY_URL || 'http://localhost:3000';
  const client = new AIPClient(registryUrl);

  console.log('🤖 Agent Identity Protocol - Basic Example\n');

  // 2. Create your agent profile
  const myAgent = createAgent({
    id: 'did:aip:my-first-agent',
    name: 'My First Agent',
    description: 'A simple agent that generates text and summarizes content',
    capabilities: [
      createCapability('text-generation', 0.9, {
        input_formats: ['text', 'json'],
        output_formats: ['markdown', 'text'],
        languages: ['en', 'ja'],
      }),
      createCapability('text-summarization', 0.85),
    ],
    endpoints: {
      api: 'https://my-agent.example.com/api/v1',
      health: 'https://my-agent.example.com/health',
    },
    pricing: {
      model: 'per-task',
      base_price: 0.01,
      currency: 'USD',
    },
    metadata: {
      framework: 'custom',
      model_provider: 'anthropic',
      created_at: new Date().toISOString(),
    },
  });

  // 3. Register your agent
  try {
    const registration = await client.register(myAgent);
    console.log('✅ Agent registered successfully!');
    console.log(`   ID: ${registration.id}`);
    console.log(`   Registered at: ${registration.registered_at}\n`);
  } catch (error) {
    console.error('❌ Registration failed:', error);
    return;
  }

  // 4. Search for agents with similar capabilities
  console.log('🔍 Searching for text generation agents...\n');
  try {
    const textGenerators = await client.search('text-generation', 0.8);
    console.log(`Found ${textGenerators.length} agent(s):\n`);

    textGenerators.forEach((agent, i) => {
      console.log(`${i + 1}. ${agent.name} (${agent.id})`);
      console.log(`   Confidence: ${agent.capabilities.find(c => c.skill === 'text-generation')?.confidence || 'N/A'}`);
      console.log(`   Metrics: ${agent.metrics?.tasks_completed || 0} tasks, ${agent.metrics?.success_rate ? (agent.metrics.success_rate * 100).toFixed(1) : 'N/A'}% success rate`);
      console.log('');
    });
  } catch (error) {
    console.error('❌ Search failed:', error);
  }

  // 5. Get a specific agent's profile
  console.log('📋 Fetching agent profile...\n');
  try {
    const profile = await client.getAgent('did:aip:my-first-agent');
    console.log(`Agent: ${profile.name}`);
    console.log(`Version: ${profile.version}`);
    console.log(`Description: ${profile.description}`);
    console.log(`Capabilities: ${profile.capabilities.map(c => c.skill).join(', ')}\n`);
  } catch (error) {
    console.error('❌ Failed to fetch profile:', error);
  }

  // 6. Report metrics after completing some tasks
  console.log('📊 Reporting performance metrics...\n');
  try {
    const metricsReport = await client.reportMetrics('did:aip:my-first-agent', {
      tasks_completed: 50,
      avg_response_time_ms: 1200,
      success_rate: 0.98,
      uptime_30d: 0.995,
    });
    console.log('✅ Metrics reported successfully!');
    console.log(`   Recorded at: ${metricsReport.recorded_at}\n`);
  } catch (error) {
    console.error('❌ Failed to report metrics:', error);
  }

  console.log('🎉 Example completed!\n');
}

// Run the example
main().catch(console.error);
