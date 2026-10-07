import { ModelFilters, parseModelFilters } from '@/lib/filters';

export const API_CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export const API_CACHE_HEADERS = {
  'Cache-Control': 'public, max-age=300',
};

export const API_SORTS = new Set([
  'price_in',
  'price_in_desc',
  'price_out',
  'price_out_desc',
  'name',
]);

export interface ApiListQuery {
  filters: ModelFilters;
  sort: string;
  page: number;
  limit: number;
}

const MAX_LIMIT = 200;

export function parseApiListParams(
  params: Record<string, string | string[] | undefined>
): ApiListQuery {
  const get = (k: string) => {
    const v = params[k];
    return (Array.isArray(v) ? v[0] : v) || '';
  };
  const filters = parseModelFilters(params);
  const sort = API_SORTS.has(get('sort')) ? get('sort') : '';
  const rawPage = parseInt(get('page'), 10);
  const page = Number.isFinite(rawPage) && rawPage > 0 ? rawPage : 1;
  const rawLimit = parseInt(get('limit'), 10);
  const limit = Number.isFinite(rawLimit) && rawLimit > 0 ? Math.min(rawLimit, MAX_LIMIT) : 50;
  return { filters, sort, page, limit };
}

export interface ApiModelRow {
  provider: string;
  slug: string;
  name: string;
  providerName: string;
  contextWindow: number;
  inputPricePerM: string;
  outputPricePerM: string;
  modalityTags: string[];
  status: string;
  updatedAt: Date;
}

export function serializeModel(m: ApiModelRow) {
  return {
    id: `${m.provider}/${m.slug}`,
    name: m.name,
    provider: m.providerName,
    providerSlug: m.provider,
    contextWindow: m.contextWindow,
    inputPricePerM: Number(m.inputPricePerM),
    outputPricePerM: Number(m.outputPricePerM),
    modalities: m.modalityTags || [],
    status: m.status,
    updatedAt: m.updatedAt instanceof Date ? m.updatedAt.toISOString() : m.updatedAt,
  };
}

export function listResponse(rows: ApiModelRow[], total: number, page: number, limit: number) {
  return {
    data: rows.map(serializeModel),
    page,
    limit,
    total,
    pages: Math.max(1, Math.ceil(total / limit)),
  };
}

export interface ApiSnapshotRow {
  capturedAt: Date;
  availability: string;
  inputPricePerM: string;
  outputPricePerM: string;
}

export function serializeSnapshot(s: ApiSnapshotRow) {
  return {
    capturedAt: s.capturedAt instanceof Date ? s.capturedAt.toISOString() : s.capturedAt,
    availability: s.availability,
    inputPricePerM: Number(s.inputPricePerM),
    outputPricePerM: Number(s.outputPricePerM),
  };
}

export function detailResponse(model: ApiModelRow | null | undefined, snapshots: ApiSnapshotRow[]) {
  if (!model) return null;
  return {
    ...serializeModel(model),
    snapshots: snapshots.map(serializeSnapshot),
  };
}
