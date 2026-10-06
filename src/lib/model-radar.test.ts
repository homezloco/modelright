import { describe, expect, it } from 'vitest';
import { fetchModelRadar, findRadarScore, type ModelRadarFeed } from './model-radar';

const feed: ModelRadarFeed = {
  publishedAt: '2026-10-04T09:00:00Z',
  bench: {
    scores: [
      { model: 'anthropic/claude-sonnet-5.5', score: 9.2, latencyMs: 2049, notes: 'Excellent task completion.' },
      { model: 'openai/gpt-6.1-sol-pro', score: 8.8, latencyMs: 1818 },
    ],
  },
};

describe('findRadarScore', () => {
  it('matches a radar entry by provider/slug', () => {
    const hit = findRadarScore(feed, 'anthropic', 'claude-sonnet-5.5');
    expect(hit?.score).toBe(9.2);
    expect(hit?.latencyMs).toBe(2049);
  });

  it('matches case-insensitively', () => {
    expect(findRadarScore(feed, 'OpenAI', 'GPT-6.1-Sol-Pro')?.score).toBe(8.8);
  });

  it('returns null when the model is not in the feed', () => {
    expect(findRadarScore(feed, 'openai', 'gpt-4o')).toBeNull();
  });

  it('returns null on empty/missing bench data', () => {
    expect(findRadarScore(null, 'anthropic', 'claude-sonnet-5.5')).toBeNull();
    expect(findRadarScore({ publishedAt: 'x' }, 'anthropic', 'claude-sonnet-5.5')).toBeNull();
    expect(findRadarScore({ publishedAt: 'x', bench: {} }, 'a', 'b')).toBeNull();
  });
});

describe('fetchModelRadar', () => {
  it('returns parsed feed on success', async () => {
    const result = await fetchModelRadar(
      (async () => new Response(JSON.stringify(feed), { status: 200 })) as typeof fetch
    );
    expect(result?.bench?.scores).toHaveLength(2);
  });

  it('returns null on non-ok responses', async () => {
    for (const status of [404, 500, 502]) {
      const result = await fetchModelRadar(
        (async () => new Response('err', { status })) as typeof fetch
      );
      expect(result).toBeNull();
    }
  });

  it('returns null when the fetch throws', async () => {
    const result = await fetchModelRadar(
      (async () => {
        throw new Error('network down');
      }) as typeof fetch
    );
    expect(result).toBeNull();
  });

  it('returns null on malformed JSON', async () => {
    const result = await fetchModelRadar(
      (async () => new Response('not json', { status: 200 })) as typeof fetch
    );
    expect(result).toBeNull();
  });
});
