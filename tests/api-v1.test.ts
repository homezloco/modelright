import { describe, it, expect } from 'vitest';
import {
  parseApiListParams,
  listResponse,
  detailResponse,
  serializeModel,
} from '../src/lib/v1-api';
import { buildModelWhereClause } from '../src/lib/filters';
import { PgDialect } from 'drizzle-orm/pg-core';

const dialect = new PgDialect();

const row = {
  provider: 'openai',
  slug: 'gpt-5',
  name: 'GPT-5',
  providerName: 'OpenAI',
  contextWindow: 1000000,
  inputPricePerM: '2.500000',
  outputPricePerM: '10.000000',
  modalityTags: ['text', 'image'],
  status: 'ok',
  updatedAt: new Date('2026-10-06T00:00:00Z'),
};

describe('q-0029 public JSON API', () => {
  it('list params parse filters + pagination', () => {
    const q = parseApiListParams({
      provider: 'openai',
      minContext: '200000',
      maxInputPrice: '5',
      modality: 'image',
      freeOnly: '1',
      sort: 'price_in',
      page: '2',
      limit: '100',
    });
    expect(q.filters.provider).toBe('openai');
    expect(q.filters.minContext).toBe(200000);
    expect(q.filters.maxInputPrice).toBe(5);
    expect(q.filters.freeOnly).toBe(true);
    expect(q.sort).toBe('price_in');
    expect(q.page).toBe(2);
    expect(q.limit).toBe(100);
  });

  it('list defaults: page 1, limit 50, cap 200, unknown sort ignored', () => {
    const q = parseApiListParams({ sort: 'evil;drop', limit: '9999', page: 'x' });
    expect(q.sort).toBe('');
    expect(q.limit).toBe(200);
    expect(q.page).toBe(1);
  });

  it('filter params produce real WHERE conditions', () => {
    const { filters } = parseApiListParams({ minContext: '100000', modality: 'audio' });
    const cond = buildModelWhereClause(filters);
    const compiled = dialect.sqlToQuery(cond!);
    expect(compiled.sql).toContain('context_window');
    expect(compiled.sql).toContain('modality_tags');
    expect(compiled.params).toContain(100000);
    expect(compiled.params).toContain('audio');
  });

  it('serializes a list row to the API shape', () => {
    const m = serializeModel(row);
    expect(m.id).toBe('openai/gpt-5');
    expect(m.inputPricePerM).toBe(2.5);
    expect(m.modalities).toEqual(['text', 'image']);
    expect(m.updatedAt).toBe('2026-10-06T00:00:00.000Z');
  });

  it('list response carries pagination envelope', () => {
    const body = listResponse([row], 250, 2, 50);
    expect(body.total).toBe(250);
    expect(body.pages).toBe(5);
    expect(body.data).toHaveLength(1);
  });

  it('detail response embeds snapshots', () => {
    const body = detailResponse(row, [
      { capturedAt: new Date('2026-10-06T01:00:00Z'), availability: 'available', inputPricePerM: '2.5', outputPricePerM: '10' },
    ]);
    expect(body!.snapshots).toHaveLength(1);
    expect(body!.snapshots[0].inputPricePerM).toBe(2.5);
  });

  it('detail response is null for an unknown model (route returns 404)', () => {
    expect(detailResponse(null, [])).toBeNull();
    expect(detailResponse(undefined, [])).toBeNull();
  });
});
