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

describe('q-0043 coding pick AA benchmark preference', () => {
  const base = (over: Partial<TaskPickModel>): TaskPickModel => ({
    id: 'x',
    name: 'X',
    slug: 'x',
    providerName: 'P',
    providerSlug: 'p',
    contextWindow: 128000,
    inputPricePerM: '1.00',
    outputPricePerM: '2.00',
    modalityTags: ['text'],
    status: 'active',
    ...over,
  });

  // pa..pe have 2+ listed models; 'niche' has one, so the plain
  // provider-count rule drops it entirely.
  const codingFixture: TaskPickModel[] = [
    base({ id: 'a1', slug: 'a1', providerSlug: 'pa', outputPricePerM: '1.00' }),
    base({ id: 'a2', slug: 'a2', providerSlug: 'pa', outputPricePerM: '1.10' }),
    base({ id: 'b1', slug: 'b1', providerSlug: 'pb', outputPricePerM: '1.20' }),
    base({ id: 'b2', slug: 'b2', providerSlug: 'pb', outputPricePerM: '1.30' }),
    base({ id: 'c1', slug: 'c1', providerSlug: 'pc', outputPricePerM: '1.40' }),
    base({ id: 'c2', slug: 'c2', providerSlug: 'pc', outputPricePerM: '1.50' }),
    base({ id: 'd1', slug: 'd1', providerSlug: 'pd', outputPricePerM: '1.60' }),
    base({ id: 'd2', slug: 'd2', providerSlug: 'pd', outputPricePerM: '1.70' }),
    base({ id: 'e1', slug: 'e1', providerSlug: 'pe', outputPricePerM: '1.80' }),
    base({ id: 'e2', slug: 'e2', providerSlug: 'pe', outputPricePerM: '1.90' }),
    base({ id: 'n1', slug: 'niche-star', providerSlug: 'niche', outputPricePerM: '5.00', codingIndex: 88 }),
    base({ id: 'a3', slug: 'a3', providerSlug: 'pa', outputPricePerM: '9.00', codingIndex: 40 }),
    base({ id: 'gone', slug: 'gone', providerSlug: 'pa', status: 'removed', codingIndex: 99 }),
  ];

  test('models carrying a coding index rank first, highest index wins', () => {
    const picks = TASK_RULES['coding'].filterAndSort(codingFixture);
    // niche-star would be excluded by the provider-count rule alone, but
    // its coding index outranks every fallback pick.
    expect(picks[0].slug).toBe('niche-star');
    expect(picks[1].slug).toBe('a3'); // 40 — second among benchmarked
  });

  test('unbenchmarked models follow in the existing provider-count order', () => {
    const picks = TASK_RULES['coding'].filterAndSort(codingFixture);
    const fallback = picks.slice(2).map((m) => m.slug);
    expect(fallback).toEqual(['a1', 'a2', 'b1', 'b2', 'c1', 'c2', 'd1', 'd2']);
    expect(picks.some((m) => m.slug === 'gone')).toBe(false); // removed never ranks
    expect(picks.length).toBeLessThanOrEqual(10);
  });

  test('with no coding indices present, matches the existing rule ordering', () => {
    const bare = codingFixture.map(({ codingIndex, ...m }) => m);
    const coding = TASK_RULES['coding'].filterAndSort(bare).map((m) => m.id);
    const chat = TASK_RULES['chat'].filterAndSort(bare).map((m) => m.id);
    expect(coding).toEqual(chat);
    // niche excluded entirely without its benchmark
    expect(coding).not.toContain('n1');
  });

  test('coding rule text describes the benchmark-then-fallback blend', () => {
    expect(TASK_RULES['coding'].ruleText).toContain('coding index');
  });
});
