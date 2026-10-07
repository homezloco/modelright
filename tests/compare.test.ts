import { describe, test, expect } from 'vitest';
import { parseModelKeys, getCheapestIndices } from '../src/app/compare/page';

describe('q-0026 Compare up to 4 models logic', () => {
  test('parseModelKeys correctly parses comma-separated keys and handles casing/whitespace', () => {
    const raw = 'openai/gpt-4o , anthropic/claude-3-5-sonnet, google/gemini-1.5-pro ';
    const parsed = parseModelKeys(raw);
    expect(parsed).toEqual([
      'openai/gpt-4o',
      'anthropic/claude-3-5-sonnet',
      'google/gemini-1.5-pro',
    ]);
  });

  test('parseModelKeys returns empty array for empty or undefined input', () => {
    expect(parseModelKeys('')).toEqual([]);
    expect(parseModelKeys(undefined)).toEqual([]);
  });

  test('getCheapestIndices correctly identifies the index of the lowest numeric value', () => {
    const prices = [5.0, 2.5, 10.0, 2.5];
    const cheapest = getCheapestIndices(prices);
    expect(cheapest).toEqual([1, 3]);
  });

  test('getCheapestIndices handles null or empty arrays gracefully', () => {
    expect(getCheapestIndices([])).toEqual([]);
    expect(getCheapestIndices([null, null])).toEqual([]);
  });
});
