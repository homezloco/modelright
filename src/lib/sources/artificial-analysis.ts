import type { IngestModelItem } from '@/lib/ingest';

export interface AAModel {
  id: string;
  name: string;
  slug: string;
  release_date?: string;
  model_creator?: { id?: string; name?: string; slug?: string };
  evaluations?: Record<string, number | null>;
  pricing?: {
    price_1m_blended_3_to_1?: number | null;
    price_1m_input_tokens?: number | null;
    price_1m_output_tokens?: number | null;
  };
  median_output_tokens_per_second?: number | null;
  median_time_to_first_token_seconds?: number | null;
}

export interface EnrichedModelItem extends IngestModelItem {
  benchmarks?: Record<string, number>;
  speed?: { outputTokensPerSecond?: number; ttftSeconds?: number };
}

const AA_ENDPOINT = 'https://artificialanalysis.ai/api/v2/data/llms/models';

export async function fetchAAModels(apiKey = process.env.AA_API_KEY): Promise<AAModel[]> {
  if (!apiKey) throw new Error('AA_API_KEY is not set');
  const res = await fetch(AA_ENDPOINT, { headers: { 'x-api-key': apiKey } });
  if (!res.ok) throw new Error(`Artificial Analysis fetch failed: ${res.status}`);
  const body = await res.json();
  const data = body?.data;
  if (!Array.isArray(data)) throw new Error('Artificial Analysis response missing data array');
  return data as AAModel[];
}

const EVAL_KEYS = [
  'artificial_analysis_intelligence_index',
  'artificial_analysis_coding_index',
  'artificial_analysis_math_index',
  'mmlu_pro',
  'gpqa',
  'hle',
  'livecodebench',
  'scicode',
  'math_500',
  'aime',
];

/**
 * AA rows carry AA-side pricing/context semantics we deliberately do NOT
 * trust as catalog truth (OpenRouter is the pricing/availability authority).
 * normalize emits contextWindow 0 / prices 0 placeholders — the ingest
 * pipeline's `enrich` mode refuses inserts and ignores these columns on
 * update, so placeholders never reach a row.
 */
export function normalizeAAModels(models: AAModel[]): EnrichedModelItem[] {
  const items: EnrichedModelItem[] = [];
  for (const m of models) {
    const providerSlug = m.model_creator?.slug?.toLowerCase();
    if (!providerSlug || !m.slug) continue;

    const benchmarks: Record<string, number> = {};
    for (const k of EVAL_KEYS) {
      const v = m.evaluations?.[k];
      if (typeof v === 'number' && Number.isFinite(v)) benchmarks[k] = v;
    }

    items.push({
      provider: { slug: providerSlug, name: m.model_creator?.name || providerSlug },
      slug: m.slug.toLowerCase(),
      name: m.name || m.slug,
      contextWindow: 0,
      inputPricePerM: 0,
      outputPricePerM: 0,
      modalityTags: [],
      availability: 'available',
      ...(Object.keys(benchmarks).length > 0 ? { benchmarks } : {}),
      speed: {
        ...(typeof m.median_output_tokens_per_second === 'number'
          ? { outputTokensPerSecond: m.median_output_tokens_per_second }
          : {}),
        ...(typeof m.median_time_to_first_token_seconds === 'number'
          ? { ttftSeconds: m.median_time_to_first_token_seconds }
          : {}),
      },
    });
  }
  return items;
}
