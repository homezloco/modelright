export interface IngestModelItem {
  provider: {
    slug: string;
    name: string;
  };
  slug: string;
  name: string;
  contextWindow: number;
  inputPricePerM: number | string;
  outputPricePerM: number | string;
  modalityTags: string[];
  availability?: string;
}

export interface OpenRouterModel {
  id: string;
  name?: string;
  context_length?: number;
  pricing?: {
    prompt?: string | number;
    completion?: string | number;
  };
  architecture?: {
    input_modalities?: string[];
    output_modalities?: string[];
  };
}

export interface OpenRouterResponse {
  data?: OpenRouterModel[];
}

export function normalizeOpenRouter(json: OpenRouterResponse): IngestModelItem[] {
  if (!json || !Array.isArray(json.data)) {
    return [];
  }

  const results: IngestModelItem[] = [];

  for (const item of json.data) {
    if (!item || !item.id || !item.id.includes('/')) {
      continue;
    }

    const contextWindow = item.context_length;
    if (typeof contextWindow !== 'number' || contextWindow <= 0) {
      continue;
    }

    const promptPrice = item.pricing?.prompt;
    const completionPrice = item.pricing?.completion;
    if (promptPrice === undefined || promptPrice === null || completionPrice === undefined || completionPrice === null) {
      continue;
    }

    const promptNum = typeof promptPrice === 'string' ? parseFloat(promptPrice) : promptPrice;
    const completionNum = typeof completionPrice === 'string' ? parseFloat(completionPrice) : completionPrice;

    if (isNaN(promptNum) || isNaN(completionNum) || promptNum < 0 || completionNum < 0) {
      continue;
    }

    const parts = item.id.split('/');
    const providerSlug = parts[0];
    const modelSlug = parts.slice(1).join('/');

    let providerName = providerSlug;
    let modelName = item.name || modelSlug;

    if (item.name && item.name.includes(': ')) {
      const nameParts = item.name.split(': ');
      providerName = nameParts[0];
      modelName = nameParts.slice(1).join(': ');
    } else if (item.name) {
      modelName = item.name;
    }

    const inputPricePerM = promptNum * 1_000_000;
    const outputPricePerM = completionNum * 1_000_000;

    const inputModalities = item.architecture?.input_modalities || [];
    const outputModalities = item.architecture?.output_modalities || [];
    const modalityTags = Array.from(new Set([...inputModalities, ...outputModalities]));

    results.push({
      provider: {
        slug: providerSlug,
        name: providerName,
      },
      slug: modelSlug,
      name: modelName,
      contextWindow,
      inputPricePerM,
      outputPricePerM,
      modalityTags,
      availability: 'available',
    });
  }

  return results;
}

export async function fetchOpenRouterCatalog(): Promise<OpenRouterResponse> {
  const res = await fetch('https://openrouter.ai/api/v1/models');
  if (!res.ok) {
    throw new Error(`Failed to fetch OpenRouter catalog: ${res.status} ${res.statusText}`);
  }
  return res.json();
}
