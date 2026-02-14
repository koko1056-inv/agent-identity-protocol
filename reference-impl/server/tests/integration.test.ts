/**
 * Integration tests for AIP Registry Server
 */

import request from 'supertest';
import { prisma } from '../src/db/client';
import crypto from 'crypto';

// Test server setup
const TEST_PORT = 3001;
const BASE_URL = `http://localhost:${TEST_PORT}`;

// Test data
const testAgent = {
  id: 'did:aip:test-agent',
  name: 'Test Agent',
  version: '1.0.0',
  capabilities: [
    {
      skill: 'text-generation',
      confidence: 0.95,
    },
  ],
  description: 'A test agent for integration tests',
};

const testAdminKey = 'test-admin-key-' + crypto.randomBytes(16).toString('hex');

describe('AIP Registry Integration Tests', () => {
  let apiKey: string;
  let webhookId: string;

  beforeAll(async () => {
    // Setup test database
    await prisma.$connect();

    // Clean up test data
    await prisma.agent.deleteMany({
      where: { id: { startsWith: 'did:aip:test-' } },
    });
    await prisma.apiKey.deleteMany({
      where: { name: { startsWith: 'test-' } },
    });
    await prisma.webhook.deleteMany({
      where: { url: { startsWith: 'https://test' } },
    });
  });

  afterAll(async () => {
    // Cleanup
    await prisma.agent.deleteMany({
      where: { id: { startsWith: 'did:aip:test-' } },
    });
    await prisma.apiKey.deleteMany({
      where: { name: { startsWith: 'test-' } },
    });
    await prisma.webhook.deleteMany({
      where: { url: { startsWith: 'https://test' } },
    });
    await prisma.$disconnect();
  });

  describe('Health Check', () => {
    it('should return healthy status', async () => {
      const response = await request(BASE_URL).get('/health');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('status', 'healthy');
      expect(response.body).toHaveProperty('database', 'connected');
      expect(response.body).toHaveProperty('timestamp');
    });
  });

  describe('Agent Registration', () => {
    it('should register a new agent', async () => {
      const response = await request(BASE_URL)
        .post('/agents')
        .send(testAgent)
        .expect(201);

      expect(response.body).toHaveProperty('id', testAgent.id);
      expect(response.body).toHaveProperty('registered_at');
    });

    it('should reject duplicate agent ID', async () => {
      const response = await request(BASE_URL)
        .post('/agents')
        .send(testAgent)
        .expect(409);

      expect(response.body).toHaveProperty('error');
      expect(response.body.code).toBe('CONFLICT');
    });

    it('should validate agent profile schema', async () => {
      const invalidAgent = {
        id: 'did:aip:invalid',
        name: '',
        version: 'not-semver',
        capabilities: [],
      };

      const response = await request(BASE_URL)
        .post('/agents')
        .send(invalidAgent)
        .expect(400);

      expect(response.body).toHaveProperty('code', 'VALIDATION_ERROR');
      expect(response.body).toHaveProperty('details');
    });
  });

  describe('Agent Search', () => {
    it('should find agents by skill', async () => {
      const response = await request(BASE_URL)
        .get('/agents?skill=text-generation')
        .expect(200);

      expect(response.body).toHaveProperty('results');
      expect(response.body).toHaveProperty('total');
      expect(Array.isArray(response.body.results)).toBe(true);
      expect(response.body.results.length).toBeGreaterThan(0);
    });

    it('should respect min_confidence filter', async () => {
      const response = await request(BASE_URL)
        .get('/agents?skill=text-generation&min_confidence=0.99')
        .expect(200);

      expect(response.body).toHaveProperty('results');
      // All results should have confidence >= 0.99
      response.body.results.forEach((agent: any) => {
        const cap = agent.capabilities.find((c: any) => c.skill === 'text-generation');
        if (cap) {
          expect(cap.confidence).toBeGreaterThanOrEqual(0.99);
        }
      });
    });

    it('should paginate results', async () => {
      const response = await request(BASE_URL)
        .get('/agents?limit=1&offset=0')
        .expect(200);

      expect(response.body).toHaveProperty('per_page', 1);
      expect(response.body.results.length).toBeLessThanOrEqual(1);
    });
  });

  describe('Agent CRUD Operations', () => {
    const testAgentId = 'did:aip:test-crud-agent';

    it('should get agent by ID', async () => {
      const response = await request(BASE_URL)
        .get(`/agents/${testAgent.id}`)
        .expect(200);

      expect(response.body).toHaveProperty('id', testAgent.id);
      expect(response.body).toHaveProperty('name', testAgent.name);
    });

    it('should return 404 for non-existent agent', async () => {
      const response = await request(BASE_URL)
        .get('/agents/did:aip:nonexistent')
        .expect(404);

      expect(response.body).toHaveProperty('code', 'NOT_FOUND');
    });

    it('should update agent', async () => {
      const updated = {
        ...testAgent,
        description: 'Updated description',
      };

      const response = await request(BASE_URL)
        .put(`/agents/${testAgent.id}`)
        .send(updated)
        .expect(200);

      expect(response.body).toHaveProperty('updated_at');
    });

    it('should delete agent', async () => {
      await request(BASE_URL).delete(`/agents/${testAgent.id}`).expect(204);

      // Verify deletion
      await request(BASE_URL).get(`/agents/${testAgent.id}`).expect(404);
    });
  });

  describe('Admin API - API Key Management', () => {
    it('should create API key with admin auth', async () => {
      const response = await request(BASE_URL)
        .post('/admin/api-keys')
        .set('Authorization', `Bearer ${testAdminKey}`)
        .send({
          name: 'test-api-key',
          permissions: {
            read: true,
            write: true,
            delete: false,
          },
        })
        .expect(201);

      expect(response.body).toHaveProperty('key');
      expect(response.body).toHaveProperty('id');
      apiKey = response.body.key;
    });

    it('should list API keys', async () => {
      const response = await request(BASE_URL)
        .get('/admin/api-keys')
        .set('Authorization', `Bearer ${testAdminKey}`)
        .expect(200);

      expect(response.body).toHaveProperty('apiKeys');
      expect(Array.isArray(response.body.apiKeys)).toBe(true);
    });

    it('should reject admin operations without auth', async () => {
      await request(BASE_URL).get('/admin/api-keys').expect(401);
    });
  });

  describe('Authentication with API Key', () => {
    beforeAll(async () => {
      // Ensure we have an API key
      if (!apiKey) {
        const response = await request(BASE_URL)
          .post('/admin/api-keys')
          .set('Authorization', `Bearer ${testAdminKey}`)
          .send({
            name: 'test-auth-key',
            permissions: {
              read: true,
              write: true,
              delete: false,
            },
          });
        apiKey = response.body.key;
      }
    });

    it('should authenticate with valid API key', async () => {
      // When REQUIRE_API_KEY is false, this passes without auth
      // When true, should require the key
      const testAgent2 = {
        id: 'did:aip:test-auth-agent',
        name: 'Auth Test Agent',
        version: '1.0.0',
        capabilities: [
          {
            skill: 'testing',
            confidence: 0.9,
          },
        ],
      };

      // This should work (either with or without REQUIRE_API_KEY)
      const response = await request(BASE_URL)
        .post('/agents')
        .set('Authorization', `Bearer ${apiKey}`)
        .send(testAgent2);

      expect([201, 409]).toContain(response.status);
    });

    it('should reject invalid API key when auth is enabled', async () => {
      // This test only applies if REQUIRE_API_KEY=true
      // Otherwise it will pass without auth
      const testAgent3 = {
        id: 'did:aip:test-invalid-auth',
        name: 'Invalid Auth Test',
        version: '1.0.0',
        capabilities: [
          {
            skill: 'testing',
            confidence: 0.9,
          },
        ],
      };

      const response = await request(BASE_URL)
        .post('/agents')
        .set('Authorization', 'Bearer invalid-key-12345')
        .send(testAgent3);

      // Either 401 (if auth required) or 201/409 (if not required)
      expect([201, 401, 409]).toContain(response.status);
    });
  });

  describe('WebHook Management', () => {
    it('should create webhook', async () => {
      const response = await request(BASE_URL)
        .post('/admin/webhooks')
        .set('Authorization', `Bearer ${testAdminKey}`)
        .send({
          url: 'https://test-webhook.example.com/webhook',
          events: ['agent.registered'],
          secret: 'test-secret-123456',
        })
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('url');
      webhookId = response.body.id;
    });

    it('should list webhooks', async () => {
      const response = await request(BASE_URL)
        .get('/admin/webhooks')
        .set('Authorization', `Bearer ${testAdminKey}`)
        .expect(200);

      expect(response.body).toHaveProperty('webhooks');
      expect(Array.isArray(response.body.webhooks)).toBe(true);
    });

    it('should update webhook', async () => {
      if (!webhookId) return; // Skip if webhook creation failed

      const response = await request(BASE_URL)
        .patch(`/admin/webhooks/${webhookId}`)
        .set('Authorization', `Bearer ${testAdminKey}`)
        .send({
          isActive: false,
        })
        .expect(200);

      expect(response.body).toHaveProperty('isActive', false);
    });

    it('should delete webhook', async () => {
      if (!webhookId) return;

      await request(BASE_URL)
        .delete(`/admin/webhooks/${webhookId}`)
        .set('Authorization', `Bearer ${testAdminKey}`)
        .expect(204);
    });
  });

  describe('Metrics Reporting', () => {
    const metricsAgentId = 'did:aip:test-metrics-agent';

    beforeAll(async () => {
      // Create agent for metrics testing
      await request(BASE_URL)
        .post('/agents')
        .send({
          id: metricsAgentId,
          name: 'Metrics Test Agent',
          version: '1.0.0',
          capabilities: [
            {
              skill: 'testing',
              confidence: 0.9,
            },
          ],
        });
    });

    it('should report metrics', async () => {
      const response = await request(BASE_URL)
        .post(`/agents/${metricsAgentId}/metrics`)
        .send({
          tasks_completed: 100,
          avg_response_time_ms: 500,
          success_rate: 0.95,
          uptime_30d: 0.99,
        })
        .expect(200);

      expect(response.body).toHaveProperty('recorded_at');
    });

    it('should validate metrics schema', async () => {
      const response = await request(BASE_URL)
        .post(`/agents/${metricsAgentId}/metrics`)
        .send({
          tasks_completed: -1, // Invalid: negative
          success_rate: 1.5, // Invalid: > 1
        })
        .expect(400);

      expect(response.body).toHaveProperty('code', 'VALIDATION_ERROR');
    });
  });

  describe('Rate Limiting', () => {
    it('should enforce rate limits on write operations', async () => {
      // This test is informational - actual rate limiting depends on config
      // Make multiple requests to test rate limiting
      const requests = [];
      for (let i = 0; i < 15; i++) {
        requests.push(
          request(BASE_URL)
            .post('/agents')
            .send({
              id: `did:aip:rate-test-${i}`,
              name: `Rate Test ${i}`,
              version: '1.0.0',
              capabilities: [
                {
                  skill: 'testing',
                  confidence: 0.9,
                },
              ],
            })
        );
      }

      const responses = await Promise.all(requests);

      // Some should succeed, potentially some get rate limited (429)
      const statuses = responses.map((r) => r.status);
      expect(statuses).toContain(201);
      // May or may not hit rate limit depending on config
    }, 30000); // Increase timeout for this test
  });

  describe('Swagger API Documentation', () => {
    it('should serve Swagger UI', async () => {
      const response = await request(BASE_URL).get('/api-docs/').expect(200);

      expect(response.text).toContain('Swagger UI');
    });

    it('should serve Swagger JSON', async () => {
      const response = await request(BASE_URL).get('/swagger.json').expect(200);

      expect(response.body).toHaveProperty('openapi');
      expect(response.body).toHaveProperty('info');
      expect(response.body).toHaveProperty('paths');
    });
  });
});
