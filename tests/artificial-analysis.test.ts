import { describe, it, expect } from 'vitest';
import { normalizeAAModels } from '../src/lib/sources/artificial-analysis';
import { buildModelUpdateSet, deriveStatus } from '../src/lib/ingest';

const fixture = [
  {
    id: 'aa-1',
    name: 'GPT-5',
    slug: 'gpt-5',
    release_date: '2025-08-07',
    model_creator: { id: 'c1', name: 'OpenAI', slug: 'openai' },
    evaluations: {
      artificial_analysis_intelligence_index: 68.1,
      artificial_analysis_coding_index: 61.2,
      mmlu_pro: 0.87,
      gpqa: 0.85,
      hle: null,
      aime: 0.94,
    },
    pricing: { price_1m_blended_3_to_1: 6.25, price_1m_input_tokens: 2.0, price_1m_output_tokens: 10.0 },
    median_output_tokens_per_second: 142.4,
    median_time_to_first_token_seconds: 0.41,
  },
  {
    id: 'aa-2',
    name: 'Orphan NoCreator',
    slug: 'orphan',
    model_creator: null,
  },
];

describe('q-0035 artificial-analysis adapter', () => {
  it('normalizes AA records into ingest items with benchmarks + speed', () => {
    const items = normalizeAAModels(fixture as never);
    expect(items).toHaveLength(1); // no creator slug -> skipped
    const m = items[0];
    expect(m.provider.slug).toBe('openai');
    expect(m.slug).toBe('gpt-5');
    expect(m.benchmarks!.artificial_analysis_intelligence_index).toBe(68.1);
    expect(m.benchmarks!.aime).toBe(0.94);
    expect(m.benchmarks!.hle).toBeUndefined(); // null dropped
    expect(m.speed!.outputTokensPerSecond).toBe(142.4);
    expect(m.speed!.ttftSeconds).toBe(0.41);
  });

  it('enrich-mode update set never clobbers pricing/context/name/modalities', () => {
    const item = normalizeAAModels(fixture as never)[0];
    const set = buildModelUpdateSet(item, new Date('2026-10-07T00:00:00Z'), { enrich: true });
    expect(set).not.toHaveProperty('inputPricePerM');
    expect(set).not.toHaveProperty('outputPricePerM');
    expect(set).not.toHaveProperty('contextWindow');
    expect(set).not.toHaveProperty('name');
    expect(set).not.toHaveProperty('modalityTags');
    expect(set.status).toBe('ok');
    expect(set).toHaveProperty('lastSeenAt');
    expect(set).toHaveProperty('lastSeenOk');
  });

  it('full-mode update set writes pricing/context/name (OpenRouter authority path)', () => {
    const item = normalizeAAModels(fixture as never)[0];
    const set = buildModelUpdateSet(item, new Date(), undefined);
    expect(set).toHaveProperty('inputPricePerM', '0');
    expect(set).toHaveProperty('contextWindow', 0);
    expect(set).toHaveProperty('name', 'GPT-5');
  });

  it('deriveStatus maps availability honestly', () => {
    expect(deriveStatus('available')).toBe('ok');
    expect(deriveStatus('offline')).toBe('degraded');
    expect(deriveStatus(undefined)).toBe('unknown');
  });
});
