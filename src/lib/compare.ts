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
