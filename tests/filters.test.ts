import { describe, test, expect } from 'vitest';
import { parseModelFilters, buildModelWhereConditions, buildModelWhereClause } from '../src/lib/filters';

describe('q-0027 Find-a-model filters query builder', () => {
  test('parseModelFilters parses default hideRemoved=true', () => {
    const filters = parseModelFilters({});
    expect(filters.hideRemoved).toBe(true);
    expect(filters.provider).toBeUndefined();
    expect(filters.minContext).toBeUndefined();
    expect(filters.maxInputPrice).toBeUndefined();
    expect(filters.modality).toBeUndefined();
    expect(filters.freeOnly).toBe(false);
  });

  test('parseModelFilters parses URL parameters correctly', () => {
    const params = {
      provider: 'OpenAI',
      minContext: '32000',
      maxInputPrice: '2.50',
      modality: 'vision',
      freeOnly: 'true',
      hideRemoved: 'false',
    };
    const filters = parseModelFilters(params);
    expect(filters.provider).toBe('openai');
    expect(filters.minContext).toBe(32000);
    expect(filters.maxInputPrice).toBe(2.50);
    expect(filters.modality).toBe('vision');
    expect(filters.freeOnly).toBe(true);
    expect(filters.hideRemoved).toBe(false);
  });

  test('buildModelWhereConditions creates SQL conditions for provider', () => {
    const conditions = buildModelWhereConditions({ provider: 'anthropic' });
    expect(conditions.length).toBe(1);
  });

  test('buildModelWhereConditions creates SQL conditions for minimum context window', () => {
    const conditions = buildModelWhereConditions({ minContext: 128000 });
    expect(conditions.length).toBe(1);
  });

  test('buildModelWhereConditions creates SQL conditions for maximum input price', () => {
    const conditions = buildModelWhereConditions({ maxInputPrice: 1.0 });
    expect(conditions.length).toBe(1);
  });

  test('buildModelWhereConditions creates SQL conditions for modality', () => {
    const conditions = buildModelWhereConditions({ modality: 'audio' });
    expect(conditions.length).toBe(1);
  });

  test('buildModelWhereConditions creates SQL conditions for free only', () => {
    const conditions = buildModelWhereConditions({ freeOnly: true });
    expect(conditions.length).toBe(1);
  });

  test('buildModelWhereConditions creates SQL conditions for default hideRemoved', () => {
    const conditions = buildModelWhereConditions({ hideRemoved: true });
    expect(conditions.length).toBe(1);
  });

  test('buildModelWhereConditions combines all filters together', () => {
    const filters = {
      provider: 'google',
      minContext: 64000,
      maxInputPrice: 5.0,
      modality: 'image',
      freeOnly: false,
      hideRemoved: true,
    };
    const conditions = buildModelWhereConditions(filters);
    // provider, minContext, maxInputPrice, hideRemoved, modality = 5 conditions
    expect(conditions.length).toBe(5);
  });

  test('buildModelWhereClause returns single or combined SQL expression or undefined', () => {
    expect(buildModelWhereClause({ hideRemoved: false })).toBeUndefined();

    const singleClause = buildModelWhereClause({ hideRemoved: true });
    expect(singleClause).toBeDefined();

    const multiClause = buildModelWhereClause({ provider: 'openai', freeOnly: true, hideRemoved: true });
    expect(multiClause).toBeDefined();
  });
});
