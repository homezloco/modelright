import { eq, gte, lte, ne, sql, SQL, and } from 'drizzle-orm';
import { models, providers } from '@/db/schema';

export interface ModelFilters {
  provider?: string;
  minContext?: number;
  maxInputPrice?: number;
  modality?: 'vision' | 'audio' | 'image' | string;
  freeOnly?: boolean;
  hideRemoved?: boolean;
}

export function parseModelFilters(searchParams?: { [key: string]: string | string[] | undefined }): ModelFilters {
  if (!searchParams) {
    return { hideRemoved: true };
  }

  const getString = (key: string): string => {
    const val = searchParams[key];
    if (Array.isArray(val)) return val[0]?.trim() || '';
    if (typeof val === 'string') return val.trim();
    return '';
  };

  const provider = getString('provider').toLowerCase() || undefined;

  const minCtxStr = getString('minContext');
  const minContextNum = parseInt(minCtxStr, 10);
  const minContext = !isNaN(minContextNum) && minContextNum > 0 ? minContextNum : undefined;

  const maxPriceStr = getString('maxInputPrice');
  const maxPriceNum = parseFloat(maxPriceStr);
  const maxInputPrice = !isNaN(maxPriceNum) && maxPriceNum >= 0 ? maxPriceNum : undefined;

  const modalityStr = getString('modality').toLowerCase();
  const modality = modalityStr ? modalityStr : undefined;

  const freeOnlyStr = getString('freeOnly');
  const freeOnly = freeOnlyStr === 'true' || freeOnlyStr === '1';

  const hideRemovedStr = getString('hideRemoved');
  // Default hideRemoved is true unless explicitly 'false' or '0'
  const hideRemoved = hideRemovedStr === 'false' || hideRemovedStr === '0' ? false : true;

  return {
    provider,
    minContext,
    maxInputPrice,
    modality,
    freeOnly,
    hideRemoved,
  };
}

export function buildModelWhereConditions(filters: ModelFilters): SQL[] {
  const conditions: SQL[] = [];

  if (filters.provider) {
    conditions.push(eq(sql`LOWER(${providers.slug})`, filters.provider));
  }

  if (filters.minContext !== undefined) {
    conditions.push(gte(models.contextWindow, filters.minContext));
  }

  if (filters.maxInputPrice !== undefined) {
    conditions.push(lte(models.inputPricePerM, filters.maxInputPrice.toString()));
  }

  if (filters.freeOnly) {
    conditions.push(eq(models.inputPricePerM, '0'));
  }

  if (filters.hideRemoved) {
    conditions.push(ne(models.status, 'removed'));
  }

  if (filters.modality) {
    // Drizzle/Postgres jsonb contains check for string array: modality_tags @> jsonb_build_array('vision')
    conditions.push(sql`${models.modalityTags} @> jsonb_build_array(${filters.modality})`);
  }

  return conditions;
}

export function buildModelWhereClause(filters: ModelFilters): SQL | undefined {
  const conditions = buildModelWhereConditions(filters);
  if (conditions.length === 0) return undefined;
  if (conditions.length === 1) return conditions[0];
  return and(...conditions);
}
