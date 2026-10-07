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
    description: 'Capable models from premier providers suited for code generation, refactoring, and debugging.',
    ruleText: 'Available paid models from the five most-listed active providers, excluding removed models, sorted by output price ascending.',
    filterAndSort: (models: TaskPickModel[]) => filterChatAndCoding(models),
  },
};

function filterChatAndCoding(models: TaskPickModel[]): TaskPickModel[] {
  // Filter active/available paid models
  const eligible = models.filter((m) => {
    if (m.status === 'removed') return false;
    const inP = parseFloat(m.inputPricePerM) || 0;
    const outP = parseFloat(m.outputPricePerM) || 0;
    // Paid models (non-zero price)
    return inP > 0 || outP > 0;
  });

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
    })
    .slice(0, 10);
}
