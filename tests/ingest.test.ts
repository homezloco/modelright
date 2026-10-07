import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import { verifyBearerToken } from '../src/lib/ingest';
import { ingestPayloadSchema } from '../src/lib/ingest-schema';

describe('Ingest Validation', () => {
  const originalEnv = process.env.INGEST_TOKEN;

  beforeEach(() => {
    process.env.INGEST_TOKEN = 'secret-token';
  });

  afterEach(() => {
    process.env.INGEST_TOKEN = originalEnv;
  });

  test('verifyBearerToken rejects request missing authorization header', () => {
    const req = new Request('http://localhost/api/ingest', { method: 'POST' });
    expect(verifyBearerToken(req)).toBe(false);
  });

  test('verifyBearerToken rejects non-Bearer header', () => {
    const req = new Request('http://localhost/api/ingest', {
      method: 'POST',
      headers: { authorization: 'Basic secret-token' },
    });
    expect(verifyBearerToken(req)).toBe(false);
  });

  test('verifyBearerToken rejects invalid token', () => {
    const req = new Request('http://localhost/api/ingest', {
      method: 'POST',
      headers: { authorization: 'Bearer wrong-token' },
    });
    expect(verifyBearerToken(req)).toBe(false);
  });

  test('verifyBearerToken accepts valid token', () => {
    const req = new Request('http://localhost/api/ingest', {
      method: 'POST',
      headers: { authorization: 'Bearer secret-token' },
    });
    expect(verifyBearerToken(req)).toBe(true);
  });

  test('ingestPayloadSchema validates correct payload', () => {
    const payload = {
      source: 'api',
      models: [
        {
          provider: { slug: 'openai', name: 'OpenAI' },
          slug: 'gpt-4o',
          name: 'GPT-4o',
          contextWindow: 128000,
          inputPricePerM: '2.50',
          outputPricePerM: '10.00',
          modalityTags: ['text', 'image'],
        },
      ],
    };

    const res = ingestPayloadSchema.safeParse(payload);
    expect(res.success).toBe(true);
    if (res.success) {
      expect(res.data.source).toBe('api');
      expect(res.data.models).toHaveLength(1);
    }
  });

  test('ingestPayloadSchema fails on missing required fields', () => {
    const invalidPayload = {
      models: [
        {
          slug: 'gpt-4o',
          // missing provider and contextWindow
        },
      ],
    };

    const res = ingestPayloadSchema.safeParse(invalidPayload);
    expect(res.success).toBe(false);
  });
});
