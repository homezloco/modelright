export interface ModelItem {
  id: string;
  name: string;
  contextWindow: number;
  inputPricePerM: string;
  outputPricePerM: string;
  modalityTags: string[];
  status: string;
  lastSeenAt: Date | null;
  updatedAt: Date;
  providerName: string;
  providerSlug: string;
  slug: string;
}

export function parseModelKeys(mParam?: string): string[] {
  if (!mParam) return [];
  return mParam
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

export function getCheapestIndices(values: (number | null)[]): number[] {
  const validValues = values.filter((v): v is number => v !== null && !isNaN(v));
  if (validValues.length === 0) return [];
  const minVal = Math.min(...validValues);
  const cheapest: number[] = [];
  values.forEach((v, idx) => {
    if (v !== null && Math.abs(v - minVal) < 1e-9) {
      cheapest.push(idx);
    }
  });
  return cheapest;
}

export interface ComparePreset {
  name: string;
  blurb: string;
  keys: string[];
}

export const CURATED_PRESETS: ComparePreset[] = [
  {
    name: 'Flagship frontier',
    blurb: 'GPT vs Claude vs Gemini',
    keys: ['openai/gpt-5.2', 'anthropic/claude-opus-4.8', 'google/gemini-3.1-pro-preview'],
  },
  {
    name: 'Budget workhorses',
    blurb: 'Strong models under ~$1/1M in',
    keys: ['deepseek/deepseek-v3.2', 'openai/gpt-4o-mini', 'google/gemini-2.5-flash', 'mistral/ministral-8b-2512'],
  },
  {
    name: 'Free tier',
    blurb: 'Zero-cost endpoints',
    keys: ['nvidia/nemotron-3-ultra-550b-a55b:free', 'google/gemma-4-31b-it:free', 'openrouter/free'],
  },
];

export function modelKey(m: Pick<ModelItem, 'providerSlug' | 'slug'>): string {
  return `${m.providerSlug}/${m.slug}`.toLowerCase();
}

/**
 * Resolve a preset's wanted keys against the loaded catalog, keeping preset
 * order and dropping models that aren't in the DB. Returns null when fewer
 * than 2 resolve — a preset should never render a degenerate comparison.
 */
export function resolvePresetKeys(
  preset: ComparePreset,
  models: Pick<ModelItem, 'providerSlug' | 'slug'>[]
): string[] | null {
  const have = new Set(models.map(modelKey));
  const keys = preset.keys.filter((k) => have.has(k.toLowerCase()));
  return keys.length >= 2 ? keys : null;
}

/** URL-safe pair form: provider--slug joined with -vs- */
export function vsSlugOf(providerSlug: string, slug: string): string {
  return `${providerSlug}--${slug}`;
}

export function vsPairPath(aKey: string, bKey: string): string {
  const [ap, as] = aKey.split('/');
  const [bp, bs] = bKey.split('/');
  return `/compare/${vsSlugOf(ap, as)}-vs-${vsSlugOf(bp, bs)}`;
}

/**
 * Parse `/compare/[pair]` slugs like `openai--gpt-4o-vs-anthropic--claude-sonnet`
 * into canonical `provider/slug` keys. Returns null on any malformed part.
 */
export function parseVsSlug(pair: string): [string, string] | null {
  const sides = pair.split('-vs-');
  if (sides.length !== 2) return null;
  const keys = sides.map((side) => {
    const idx = side.indexOf('--');
    if (idx <= 0 || idx === side.length - 2) return null;
    return `${side.slice(0, idx)}/${side.slice(idx + 2)}`.toLowerCase();
  });
  return keys[0] && keys[1] ? [keys[0], keys[1]] : null;
}

export function priceTier(inputPricePerM: string | number | null): string {
  const p = typeof inputPricePerM === 'string' ? parseFloat(inputPricePerM) : inputPricePerM ?? NaN;
  if (!isFinite(p)) return 'unknown';
  if (p === 0) return 'free';
  if (p < 1) return 'budget';
  if (p < 10) return 'mid';
  return 'premium';
}

export interface VsPairCandidate {
  providerSlug: string;
  slug: string;
  inputPricePerM: string;
  updatedAt: Date | null;
}

/**
 * Pairs for the sitemap: all unordered pairs within the same price tier drawn
 * from the `recentCount` most recently updated models, capped at `maxPairs`.
 */
export function buildVsPairs(
  candidates: VsPairCandidate[],
  { recentCount = 30, maxPairs = 60 }: { recentCount?: number; maxPairs?: number } = {}
): string[] {
  const recent = [...candidates]
    .sort((a, b) => (b.updatedAt?.getTime() ?? 0) - (a.updatedAt?.getTime() ?? 0))
    .slice(0, recentCount);

  const byTier = new Map<string, VsPairCandidate[]>();
  for (const m of recent) {
    const tier = priceTier(m.inputPricePerM);
    const list = byTier.get(tier) ?? [];
    list.push(m);
    byTier.set(tier, list);
  }

  const pairs: string[] = [];
  for (const tierModels of byTier.values()) {
    for (let i = 0; i < tierModels.length && pairs.length < maxPairs; i++) {
      for (let j = i + 1; j < tierModels.length && pairs.length < maxPairs; j++) {
        pairs.push(
          vsPairPath(
            `${tierModels[i].providerSlug}/${tierModels[i].slug}`,
            `${tierModels[j].providerSlug}/${tierModels[j].slug}`
          )
        );
      }
    }
  }
  return pairs;
}
