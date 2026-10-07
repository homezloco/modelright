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
