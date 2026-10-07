export interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export interface ModelItem {
  id: string;
  name: string;
  contextWindow: number;
  inputPricePerM: string;
  outputPricePerM: string;
  numericInputPrice: number;
  numericOutputPrice: number;
  modalityTags: string[];
  status: string;
  lastSeenAt: Date | null;
  updatedAt: Date;
  providerName: string;
  providerSlug: string;
  slug: string;
}

export function parseModelParam(param?: string) {
  if (!param) return null;
  const parts = param.split('/');
  if (parts.length !== 2) return null;
  const [provider, slug] = parts;
  if (!provider || !slug) return null;
  return { provider: provider.toLowerCase(), slug: slug.toLowerCase() };
}

export function processCompareParams(params: Record<string, string | string[] | undefined>) {
  const a = Array.isArray(params.a) ? params.a[0] : params.a;
  const b = Array.isArray(params.b) ? params.b[0] : params.b;
  const m = Array.isArray(params.m) ? params.m[0] : params.m;

  if (a || b) {
    const list = [a, b].filter(Boolean).join(',');
    return { redirectUrl: `/compare?m=${encodeURIComponent(list)}`, modelKeys: [], exceedsLimit: false };
  }
  const rawList = m ? m.split(',').map((s) => s.trim()).filter(Boolean) : [];
  const exceedsLimit = rawList.length > 4;
  const modelKeys = rawList.slice(0, 4);
  return { redirectUrl: null, modelKeys, exceedsLimit };
}

