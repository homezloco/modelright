export interface TaskPickModel {
  id: string;
  name: string;
  slug: string;
  providerName: string;
  providerSlug: string;
  contextWindow: number;
  inputPricePerM: string;
  outputPricePerM: string;
  modalityTags: string[];
  status: string;
  /** Artificial Analysis coding index from the model's newest benchmarked
   *  snapshot; null/absent when the model carries no AA coding data. */
  codingIndex?: number | null;
}

export type TaskCategory = 'chat' | 'coding' | 'long-context' | 'vision' | 'cheap-bulk';

export interface TaskRule {
  key: TaskCategory;
  title: string;
  description: string;
  ruleText: string;
  filterAndSort: (models: TaskPickModel[]) => TaskPickModel[];
}

export const TASK_RULES: Record<TaskCategory, TaskRule> = {
  'long-context': {
    key: 'long-context',
    title: 'Long Context Task Picks',
    description: 'Models with massive context windows for large doc analysis, codebases, and long conversations.',
    ruleText: 'Models with context window >= 200,000 tokens, excluding removed models, sorted by input price ascending.',
    filterAndSort: (models: TaskPickModel[]) => {
      return models
        .filter((m) => m.status !== 'removed' && m.contextWindow >= 200000)
        .sort((a, b) => {
          const priceA = parseFloat(a.inputPricePerM) || 0;
          const priceB = parseFloat(b.inputPricePerM) || 0;
          if (priceA !== priceB) return priceA - priceB;
          return a.name.localeCompare(b.name);
        })
        .slice(0, 10);
    },
  },
  'vision': {
    key: 'vision',
    title: 'Vision Task Picks',
    description: 'Models supporting image input for OCR, visual analysis, diagrams, and multimodal workflows.',
    ruleText: 'Models supporting image input (modality tags include vision or image), excluding removed models, sorted by output price ascending.',
    filterAndSort: (models: TaskPickModel[]) => {
      return models
        .filter((m) => {
          if (m.status === 'removed') return false;
          const tags = (m.modalityTags || []).map((t) => t.toLowerCase());
          return tags.includes('vision') || tags.includes('image');
        })
        .sort((a, b) => {
          const priceA = parseFloat(a.outputPricePerM) || 0;
          const priceB = parseFloat(b.outputPricePerM) || 0;
          if (priceA !== priceB) return priceA - priceB;
          return a.name.localeCompare(b.name);
        })
        .slice(0, 10);
    },
  },
  'cheap-bulk': {
    key: 'cheap-bulk',
    title: 'Cheap Bulk Task Picks',
    description: 'Budget-friendly models for high-volume background processing, classification, and batch workloads.',
    ruleText: 'Models with input price <= $0.50 / 1M tokens, excluding removed models, sorted by input price ascending.',
    filterAndSort: (models: TaskPickModel[]) => {
      return models
        .filter((m) => {
          if (m.status === 'removed') return false;
          const price = parseFloat(m.inputPricePerM);
          return !isNaN(price) && price <= 0.50;
        })
        .sort((a, b) => {
          const priceA = parseFloat(a.inputPricePerM) || 0;
          const priceB = parseFloat(b.inputPricePerM) || 0;
          if (priceA !== priceB) return priceA - priceB;
          return a.name.localeCompare(b.name);
        })
        .slice(0, 10);
    },
  },
  'chat': {
    key: 'chat',
    title: 'General Chat Task Picks',
    description: 'General conversational models from leading active providers.',
    ruleText: 'Available paid models from the five most-listed active providers, excluding removed models, sorted by output price ascending.',
    filterAndSort: (models: TaskPickModel[]) => filterChatAndCoding(models),
  },
  'coding': {
    key: 'coding',
    title: 'Coding Task Picks',
    description: 'Capable models suited for code generation, refactoring, and debugging — benchmarked models first.',
    ruleText: 'Available paid models carrying an Artificial Analysis coding index rank first, highest index wins; remaining slots fall back to the five most-listed active providers, sorted by output price ascending. Removed models excluded.',
    filterAndSort: (models: TaskPickModel[]) => filterCoding(models),
  },
};

// Filter active/available paid models
function eligiblePaidModels(models: TaskPickModel[]): TaskPickModel[] {
  return models.filter((m) => {
    if (m.status === 'removed') return false;
    const inP = parseFloat(m.inputPricePerM) || 0;
    const outP = parseFloat(m.outputPricePerM) || 0;
    // Paid models (non-zero price)
    return inP > 0 || outP > 0;
  });
}

// Existing rule ordering, unsliced: paid models from the five most-listed
// active providers, sorted by output price ascending.
function providerCountOrdering(models: TaskPickModel[]): TaskPickModel[] {
  const eligible = eligiblePaidModels(models);

  // Count models per provider among eligible
  const providerCounts: Record<string, number> = {};
  for (const m of eligible) {
    providerCounts[m.providerSlug] = (providerCounts[m.providerSlug] || 0) + 1;
  }

  // Find top 5 providers by listed model count
  const top5Providers = new Set(
    Object.entries(providerCounts)
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .slice(0, 5)
      .map(([slug]) => slug)
  );

  return eligible
    .filter((m) => top5Providers.has(m.providerSlug))
    .sort((a, b) => {
      const priceA = parseFloat(a.outputPricePerM) || 0;
      const priceB = parseFloat(b.outputPricePerM) || 0;
      if (priceA !== priceB) return priceA - priceB;
      return a.name.localeCompare(b.name);
    });
}

function filterChatAndCoding(models: TaskPickModel[]): TaskPickModel[] {
  return providerCountOrdering(models).slice(0, 10);
}

/**
 * Coding picks prefer real benchmark data: eligible models carrying an AA
 * coding index rank first (index descending); models without one keep the
 * existing provider-count rule ordering and follow after the ranked set.
 */
function filterCoding(models: TaskPickModel[]): TaskPickModel[] {
  const benchmarked = eligiblePaidModels(models)
    .filter((m) => typeof m.codingIndex === 'number' && Number.isFinite(m.codingIndex))
    .sort(
      (a, b) =>
        (b.codingIndex as number) - (a.codingIndex as number) ||
        a.name.localeCompare(b.name)
    );

  const rankedIds = new Set(benchmarked.map((m) => m.id));
  const rest = providerCountOrdering(models).filter((m) => !rankedIds.has(m.id));

  return [...benchmarked, ...rest].slice(0, 10);
}
