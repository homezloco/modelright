import { describe, test, expect } from 'vitest';
import { TASK_RULES, TaskPickModel } from '../src/lib/picks';

const sampleModels: TaskPickModel[] = [
  {
    id: 'm1',
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
    id: 'm2',
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
  {
    id: 'm3',
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
    id: 'm4',
    name: 'GPT-4o Mini',
    slug: 'gpt-4o-mini',
    providerName: 'OpenAI',
    providerSlug: 'openai',
    contextWindow: 128000,
    inputPricePerM: '0.15',
    outputPricePerM: '0.60',
    modalityTags: ['text', 'vision'],
    status: 'active',
  },
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
    slug: 'gemini-1-5-flash',
    providerName: 'Google',
    providerSlug: 'google',
    contextWindow: 1000000,
    inputPricePerM: '0.075',
    outputPricePerM: '0.30',
    modalityTags: ['text', 'vision', 'audio'],
    status: 'active',
  },
  {
    id: 'm7',
    name: 'Old Deprecated Model',
    slug: 'old-model',
    providerName: 'OpenAI',
    providerSlug: 'openai',
    contextWindow: 500000,
    inputPricePerM: '0.10',
    outputPricePerM: '0.20',
    modalityTags: ['text'],
    status: 'removed',
  },
];

describe('q-0028 Task Picks Selection Rules', () => {
  test('long-context filter requires contextWindow >= 200000 and ignores removed models', () => {
    const picks = TASK_RULES['long-context'].filterAndSort(sampleModels);
    expect(picks.every((m) => m.contextWindow >= 200000 && m.status !== 'removed')).toBe(true);
    expect(picks.some((m) => m.slug === 'old-model')).toBe(false);
    expect(picks[0].slug).toBe('gemini-1-5-flash'); // $0.075 input price
  });

  test('vision filter selects vision/image modality tags and sorts by output price', () => {
    const picks = TASK_RULES['vision'].filterAndSort(sampleModels);
    expect(picks.every((m) => m.modalityTags.some((t) => ['vision', 'image'].includes(t)))).toBe(true);
    expect(picks[0].slug).toBe('gemini-1-5-flash'); // output $0.30
  });

  test('cheap-bulk filter requires inputPricePerM <= $0.50', () => {
    const picks = TASK_RULES['cheap-bulk'].filterAndSort(sampleModels);
    expect(picks.every((m) => parseFloat(m.inputPricePerM) <= 0.50 && m.status !== 'removed')).toBe(true);
    expect(picks[0].slug).toBe('gemini-1-5-flash'); // $0.075
  });

  test('chat and coding picks filter top active provider models', () => {
    const chatPicks = TASK_RULES['chat'].filterAndSort(sampleModels);
    const codingPicks = TASK_RULES['coding'].filterAndSort(sampleModels);
    expect(chatPicks.length).toBeGreaterThan(0);
    expect(codingPicks.length).toBeGreaterThan(0);
    expect(chatPicks.some((m) => m.slug === 'old-model')).toBe(false);
  });
});
