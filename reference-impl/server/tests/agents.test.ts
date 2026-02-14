import { AgentProfileSchema } from '../src/middleware/validation';

describe('Agent Profile Validation', () => {
  it('should validate a minimal agent profile', () => {
    const profile = {
      id: 'did:aip:test-agent',
      name: 'TestAgent',
      version: '1.0.0',
      capabilities: [
        {
          skill: 'text-generation',
          confidence: 0.9,
        },
      ],
    };

    const result = AgentProfileSchema.safeParse(profile);
    expect(result.success).toBe(true);
  });

  it('should reject invalid version format', () => {
    const profile = {
      id: 'did:aip:test-agent',
      name: 'TestAgent',
      version: 'invalid',
      capabilities: [
        {
          skill: 'text-generation',
          confidence: 0.9,
        },
      ],
    };

    const result = AgentProfileSchema.safeParse(profile);
    expect(result.success).toBe(false);
  });

  it('should reject confidence out of range', () => {
    const profile = {
      id: 'did:aip:test-agent',
      name: 'TestAgent',
      version: '1.0.0',
      capabilities: [
        {
          skill: 'text-generation',
          confidence: 1.5, // Invalid: > 1.0
        },
      ],
    };

    const result = AgentProfileSchema.safeParse(profile);
    expect(result.success).toBe(false);
  });

  it('should require at least one capability', () => {
    const profile = {
      id: 'did:aip:test-agent',
      name: 'TestAgent',
      version: '1.0.0',
      capabilities: [], // Invalid: empty
    };

    const result = AgentProfileSchema.safeParse(profile);
    expect(result.success).toBe(false);
  });

  it('should accept optional fields', () => {
    const profile = {
      id: 'did:aip:test-agent',
      name: 'TestAgent',
      version: '1.0.0',
      capabilities: [
        {
          skill: 'text-generation',
          confidence: 0.9,
          parameters: {
            languages: ['en', 'ja'],
          },
        },
      ],
      description: 'A test agent',
      endpoints: {
        api: 'https://example.com/api',
      },
      pricing: {
        model: 'free',
      },
      metadata: {
        custom_field: 'custom_value',
      },
    };

    const result = AgentProfileSchema.safeParse(profile);
    expect(result.success).toBe(true);
  });
});
