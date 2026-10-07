import { describe, test, expect } from 'vitest';
import { extractAABenchmarks } from '../src/lib/aa-benchmarks';

// Shape mirrors what normalizeAAModels stores as model_snapshots.rawPayload
// during the 'artificial-analysis' enrich sync.
const aaPayload = {
  provider: { slug: 'openai', name: 'OpenAI' },
  slug: 'gpt-5',
  name: 'GPT-5',
  benchmarks: {
    artificial_analysis_intelligence_index: 68.1,
    artificial_analysis_coding_index: 61.2,
    mmlu_pro: 0.87,
    gpqa: 0.85,
    aime: 0.94,
  },
  speed: { outputTokensPerSecond: 142.4, ttftSeconds: 0.41 },
};

const openrouterPayload = {
  provider: { slug: 'openai', name: 'OpenAI' },
  slug: 'gpt-5',
  name: 'GPT-5',
  contextWindow: 128000,
  inputPricePerM: 2.5,
  outputPricePerM: 10,
  modalityTags: ['text'],
  availability: 'available',
};

describe('extractAABenchmarks (q-0037)', () => {
  test('returns null for empty / missing rows', () => {
    expect(extractAABenchmarks([])).toBeNull();
    expect(extractAABenchmarks(null)).toBeNull();
    expect(extractAABenchmarks(undefined)).toBeNull();
  });

  test('returns null when no snapshot carries AA fields', () => {
    expect(
      extractAABenchmarks([
        { rawPayload: openrouterPayload },
        { rawPayload: { benchmarks: {} } }, // present but empty
        { rawPayload: null },
        {},
      ])
    ).toBeNull();
  });

  test('extracts all four fields from a full AA payload', () => {
    const result = extractAABenchmarks([{ rawPayload: aaPayload }]);
    expect(result).toEqual({
      intelligenceIndex: 68.1,
      codingIndex: 61.2,
      outputTokensPerSecond: 142.4,
      ttftSeconds: 0.41,
    });
  });

  test('returns the newest (first) AA snapshot when several rows match', () => {
    const older = {
      rawPayload: {
        ...aaPayload,
        benchmarks: { artificial_analysis_intelligence_index: 40 },
        speed: { outputTokensPerSecond: 90 },
      },
    };
    const result = extractAABenchmarks([{ rawPayload: aaPayload }, older]);
    expect(result?.intelligenceIndex).toBe(68.1);
    expect(result?.outputTokensPerSecond).toBe(142.4);
  });

  test('skips non-AA rows and finds the newest AA row behind them', () => {
    const result = extractAABenchmarks([
      { rawPayload: openrouterPayload },
      { rawPayload: 'not-an-object' },
      { rawPayload: aaPayload },
    ]);
    expect(result?.intelligenceIndex).toBe(68.1);
  });

  test('partial fields: benchmarks only -> speed fields null', () => {
    const result = extractAABenchmarks([
      {
        rawPayload: {
          benchmarks: { artificial_analysis_intelligence_index: 55.5 },
        },
      },
    ]);
    expect(result).toEqual({
      intelligenceIndex: 55.5,
      codingIndex: null,
      outputTokensPerSecond: null,
      ttftSeconds: null,
    });
  });

  test('partial fields: speed only -> index fields null', () => {
    const result = extractAABenchmarks([
      { rawPayload: { speed: { outputTokensPerSecond: 88.2 } } },
    ]);
    expect(result).toEqual({
      intelligenceIndex: null,
      codingIndex: null,
      outputTokensPerSecond: 88.2,
      ttftSeconds: null,
    });
  });

  test('non-finite / wrong-type values are dropped, row still qualifies', () => {
    const result = extractAABenchmarks([
      {
        rawPayload: {
          benchmarks: {
            artificial_analysis_intelligence_index: 'high',
            artificial_analysis_coding_index: NaN,
          },
          speed: { outputTokensPerSecond: Infinity, ttftSeconds: 0.3 },
        },
      },
    ]);
    expect(result).toEqual({
      intelligenceIndex: null,
      codingIndex: null,
      outputTokensPerSecond: null,
      ttftSeconds: 0.3,
    });
  });

  test('falls back to an older row when the newest AA payload has no renderable fields', () => {
    const result = extractAABenchmarks([
      { rawPayload: { benchmarks: { mmlu_pro: 0.9 }, speed: {} } },
      { rawPayload: aaPayload },
    ]);
    expect(result?.intelligenceIndex).toBe(68.1);
  });
});
