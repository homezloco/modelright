import { describe, it, expect } from 'vitest';
import openrouterFixture from './__fixtures__/openrouter-models.json';
import { normalizeOpenRouter, OpenRouterResponse } from './openrouter';

describe('OpenRouter Source Adapter', () => {
  it('correctly normalizes OpenRouter catalog fixture data and ignores invalid entries', () => {
    const normalized = normalizeOpenRouter(openrouterFixture as OpenRouterResponse);

    expect(normalized).toHaveLength(3);

    expect(normalized[0]).toEqual({
      provider: {
        slug: 'openai',
        name: 'OpenAI',
      },
      slug: 'gpt-4o',
      name: 'GPT-4o',
      contextWindow: 128000,
      inputPricePerM: 5,
      outputPricePerM: 15,
      modalityTags: ['text', 'image'],
      availability: 'available',
    });

    expect(normalized[1]).toEqual({
      provider: {
        slug: 'anthropic',
        name: 'Anthropic',
      },
      slug: 'claude-3-5-sonnet',
      name: 'Claude 3.5 Sonnet',
      contextWindow: 200000,
      inputPricePerM: 3,
      outputPricePerM: 15,
      modalityTags: ['text', 'image'],
      availability: 'available',
    });

    expect(normalized[2]).toEqual({
      provider: {
        slug: 'meta-llama',
        name: 'Meta',
      },
      slug: 'llama-3.1-8b-instruct:free',
      name: 'Llama 3.1 8B Instruct (free)',
      contextWindow: 131072,
      inputPricePerM: 0,
      outputPricePerM: 0,
      modalityTags: ['text'],
      availability: 'available',
    });
  });

  it('handles empty or malformed inputs gracefully', () => {
    expect(normalizeOpenRouter({} as OpenRouterResponse)).toEqual([]);
    expect(normalizeOpenRouter({ data: [] })).toEqual([]);
  });
});
