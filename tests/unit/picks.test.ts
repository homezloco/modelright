import { describe, test, expect } from 'vitest';
import { TASK_RULES, TaskPickModel } from '../../src/lib/picks';

const FIXTURE_MODELS: TaskPickModel[] = [
  // Provider: openai
  {
    id: 'm1',
    name: 'GPT-4o',
    slug: 'gpt-4o',
    providerName: 'OpenAI',
    providerSlug: 'openai',
    contextWindow: 128000,
    inputPricePerM: '2.50',
    outputPricePerM: '10.00',
    modalityTags: ['text', 'vision'],
    status: 'active',
  },
  {
    id: 'm2',
    name: 'GPT-4o-mini',
    slug: 'gpt-4o-mini',
    providerName: 'OpenAI',
    providerSlug: 'openai',
    contextWindow: 128000,
    inputPricePerM: '0.15',
    outputPricePerM: '0.60',
    modalityTags: ['text', 'vision'],
    status: 'active',
  },
  // Provider: anthropic
  {
    id: 'm3',
    name: 'Claude 3.5 Sonnet',
    slug: 'claude-3-5-sonnet',
    providerName: 'Anthropic',
    providerSlug: 'anthropic',
    contextWindow: 200000,
    inputPricePerM: '3.00',
    outputPricePerM: '15.00',
    modalityTags: ['text', 'vision'],
    status: 'active',
  },
  {
    id: 'm4',
    name: 'Claude 3 Haiku',
    slug: 'claude-3-haiku',
    providerName: 'Anthropic',
    providerSlug: 'anthropic',
    contextWindow: 200000,
    inputPricePerM: '0.25',
    outputPricePerM: '1.25',
    modalityTags: ['text', 'vision'],
    status: 'active',
  },
  // Provider: google
  {
    id: 'm5',
    name: 'Gemini 1.5 Pro',
    slug: 'gemini-1-5-pro',
    providerName: 'Google',
    providerSlug: 'google',
    contextWindow: 2000000,
    inputPricePerM: '1.25',
    outputPricePerM: '5.00',
    modalityTags: ['text', 'vision', 'audio'],
    status: 'active',
  },
  {
    id: 'm6',
    name: 'Gemini 1.5 Flash',
    slug: 'gemini-1- flash',
    providerName: 'Google',
    providerSlug: 'google',
    contextWindow: 1000000,
    inputPricePerM: '0.075',
    outputPricePerM: '0.30',
    modalityTags: ['text', 'vision'],
    status: 'active',
  },
  // Provider: mistral
  {
    id: 'm7',
    name: 'Mistral Large',
    slug: 'mistral-large',
    providerName: 'Mistral',
    providerSlug: 'mistral',
    contextWindow: 128000,
    inputPricePerM: '2.00',
    outputPricePerM: '6.00',
    modalityTags: ['text'],
    status: 'active',
  },
  {
    id: 'm8',
    name: 'Mistral Small',
    slug: 'mistral-small',
    providerName: 'Mistral',
    providerSlug: 'mistral',
    contextWindow: 32000,
    inputPricePerM: '0.20',
    outputPricePerM: '0.60',
    modalityTags: ['text'],
    status: 'active',
  },
  // Provider: cohere
  {
    id: 'm9',
    name: 'Command R+',
    slug: 'command-r-plus',
    providerName: 'Cohere',
    providerSlug: 'cohere',
    contextWindow: 128000,
    inputPricePerM: '2.50',
    outputPricePerM: '10.00',
    modalityTags: ['text'],
    status: 'active',
  },
  // Provider: deepseek
  {
    id: 'm10',
    name: 'DeepSeek V3',
    slug: 'deepseek-v3',
    providerName: 'DeepSeek',
    providerSlug: 'deepseek',
    contextWindow: 64000,
    inputPricePerM: '0.14',
    outputPricePerM: '0.28',
    modalityTags: ['text'],
    status: 'active',
  },
  // Removed model
  {
    id: 'm11',
    name: 'Old Model',
    slug: 'old-model',
    providerName: 'OpenAI',
    providerSlug: 'openai',
    contextWindow: 300000,
    inputPricePerM: '0.01',
    outputPricePerM: '0.01',
    modalityTags: ['text', 'vision'],
    status: 'removed',
  },
];

describe('Task Picks Ranking Rules', () => {
  test('long-context rule: contextWindow >= 200k, non-removed, sorted by input price ascending', () => {
    const picks = TASK_RULES['long-context'].filterAndSort(FIXTURE_MODELS);
    expect(picks.length).toBe(4);
    // Should exclude contextWindow < 200k and removed models
    expect(picks.map((m) => m.slug)).toEqual([
      'gemini-1- flash', // $0.075 / 1M
      'claude-3-haiku',  // $0.25 / 1M
      'gemini-1-5-pro',  // $1.25 / 1M
      'claude-3-5-sonnet', // $3.00 / 1M
    ]);
  });

  test('vision rule: has vision or image tag, non-removed, sorted by output price ascending', () => {
    const picks = TASK_RULES['vision'].filterAndSort(FIXTURE_MODELS);
    // Matching models: GPT-4o, GPT-4o-mini, Claude 3.5 Sonnet, Claude 3 Haiku, Gemini 1.5 Pro, Gemini 1.5 Flash
    expect(picks.length).toBe(6);
    expect(picks[0].slug).toBe('gemini-1- flash'); // $0.30 output
    expect(picks[1].slug).toBe('gpt-4o-mini');    // $0.60 output
    expect(picks[2].slug).toBe('claude-3-haiku');  // $1.25 output
  });

  test('cheap-bulk rule: input price <= $0.50/1M, non-removed, sorted by input price ascending', () => {
    const picks = TASK_RULES['cheap-bulk'].filterAndSort(FIXTURE_MODELS);
    // Matching: Gemini Flash ($0.075), DeepSeek V3 ($0.14), GPT-4o-mini ($0.15), Mistral Small ($0.20), Claude 3 Haiku ($0.25)
    expect(picks.length).toBe(5);
    expect(picks.map((m) => m.slug)).toEqual([
      'gemini-1- flash',
      'deepseek-v3',
      'gpt-4o-mini',
      'mistral-small',
      'claude-3-haiku',
    ]);
  });

  test('chat & coding rule: paid models from top 5 providers, non-removed, sorted by output price ascending', () => {
    const picks = TASK_RULES['chat'].filterAndSort(FIXTURE_MODELS);
    // Providers with counts:
    // openai: 2 (m1, m2)
    // anthropic: 2 (m3, m4)
    // google: 2 (m5, m6)
    // mistral: 2 (m7, m8)
    // cohere: 1 (m9)
    // deepseek: 1 (m10)
    // Top 5 providers selected (alphabetical tie-breaker for 1-count providers): anthropic, google, mistral, openai, cohere
    const providerSlugs = new Set(picks.map((m) => m.providerSlug));
    expect(providerSlugs.has('deepseek')).toBe(false); // 6th provider excluded
    expect(picks.length).toBe(9); // 2+2+2+2+1 = 9 models
    expect(picks[0].slug).toBe('gemini-1- flash'); // $0.30 output price lowest
  });
});
