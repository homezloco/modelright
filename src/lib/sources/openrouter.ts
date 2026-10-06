export interface OpenRouterRawModel {
  id: string;
  name: string;
  context_length: number;
  pricing?: {
    prompt?: string | number;
    completion?: string | number;
  };
  architecture?: {
    input_modalities?: string[];
    output_modalities?: string[];
  };
}

export async function fetchOpenRouterCatalog(): Promise<OpenRouterRawModel[]> {
  const res = await fetch('https://openrouter.ai/api/v1/models');
  if (!res.ok) {
    throw new Error(`Failed to fetch OpenRouter catalog: ${res.statusText}`);
  }
  const data = await res.json();
  return data.data || [];
}

export interface NormalizedModelItem {
  provider: { slug: string; name: string };
  slug: string;
  name: string;
  contextWindow: number;
  inputPricePerM: number;
  outputPricePerM: number;
  modalityTags: string[];
  availability: string;
}

export function normalizeOpenRouter(models: OpenRouterRawModel[]): NormalizedModelItem[] {
  const items: NormalizedModelItem[] = [];
  if (!Array.isArray(models)) return items;
  for (const m of models) {
    if (!m.id || !m.id.includes('/')) continue;
    if (m.context_length === undefined || m.context_length === null || m.context_length <= 0) continue;
    if (!m.pricing || m.pricing.prompt === undefined || m.pricing.completion === undefined) continue;

    const [providerSlug, ...rest] = m.id.split('/');
    const modelSlug = rest.join('/');
    if (!providerSlug || !modelSlug) continue;

    let providerName = providerSlug.charAt(0).toUpperCase() + providerSlug.slice(1);
    let modelName = m.name || modelSlug;
    if (m.name && m.name.includes(':')) {
      const parts = m.name.split(':');
      providerName = parts[0].trim();
      modelName = parts.slice(1).join(':').trim();
    }

    const promptPriceNum = typeof m.pricing.prompt === 'string' ? parseFloat(m.pricing.prompt) : m.pricing.prompt;
    const completionPriceNum = typeof m.pricing.completion === 'string' ? parseFloat(m.pricing.completion) : m.pricing.completion;

    if (isNaN(promptPriceNum) || isNaN(completionPriceNum) || promptPriceNum < 0 || completionPriceNum < 0) {
      continue;
    }

    const inputPricePerM = promptPriceNum * 1_000_000;
    const outputPricePerM = completionPriceNum * 1_000_000;

    const modalities = new Set<string>();
    if (m.architecture?.input_modalities) {
      for (const mod of m.architecture.input_modalities) modalities.add(mod.toLowerCase());
    }
    if (m.architecture?.output_modalities) {
      for (const mod of m.architecture.output_modalities) modalities.add(mod.toLowerCase());
    }

    items.push({
      provider: {
        slug: providerSlug,
        name: providerName,
      },
      slug: modelSlug,
      name: modelName,
      contextWindow: m.context_length,
      inputPricePerM,
      outputPricePerM,
      modalityTags: Array.from(modalities),
      availability: 'available',
    });
  }
  return items;
}
