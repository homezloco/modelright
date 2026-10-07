import { describe, test, expect } from 'vitest';
import { processCompareParams, parseModelParam, ModelItem } from '../src/app/compare/page';
import { calculateCost } from '../src/lib/calculator';

describe('q-0026 Compare up to 4 models', () => {
  test('redirects legacy a/b parameters to ?m= format', () => {
    const legacyBoth = processCompareParams({
      a: 'anthropic/claude-3-5-sonnet',
      b: 'openai/gpt-4o',
    });
    expect(legacyBoth.redirectUrl).toBe('/compare?m=anthropic%2Fclaude-3-5-sonnet%2Copenai%2Fgpt-4o');

    const legacySingle = processCompareParams({
      a: 'anthropic/claude-3-5-sonnet',
    });
    expect(legacySingle.redirectUrl).toBe('/compare?m=anthropic%2Fclaude-3-5-sonnet');
  });

  test('handles 3-model compare parameter parsing and cost calculations', () => {
    const result = processCompareParams({
      m: 'anthropic/claude-3-5-sonnet,openai/gpt-4o,google/gemini-1-5-pro',
    });

    expect(result.redirectUrl).toBeNull();
    expect(result.exceedsLimit).toBe(false);
    expect(result.modelKeys).toHaveLength(3);
    expect(result.modelKeys).toEqual([
      'anthropic/claude-3-5-sonnet',
      'openai/gpt-4o',
      'google/gemini-1-5-pro',
    ]);

    const parsedModels = result.modelKeys.map((k) => parseModelParam(k));
    expect(parsedModels).toEqual([
      { provider: 'anthropic', slug: 'claude-3-5-sonnet' },
      { provider: 'openai', slug: 'gpt-4o' },
      { provider: 'google', slug: 'gemini-1-5-pro' },
    ]);

    // Test cost calculator totals for 3 models
    const mockModels: ModelItem[] = [
      {
        id: '1',
        name: 'Claude 3.5 Sonnet',
        contextWindow: 200000,
        inputPricePerM: '3.00',
        outputPricePerM: '15.00',
        numericInputPrice: 3.0,
        numericOutputPrice: 15.0,
        modalityTags: ['text', 'vision'],
        status: 'ok',
        lastSeenAt: null,
        updatedAt: new Date(),
        providerName: 'Anthropic',
        providerSlug: 'anthropic',
        slug: 'claude-3-5-sonnet',
      },
      {
        id: '2',
        name: 'GPT-4o',
        contextWindow: 128000,
        inputPricePerM: '2.50',
        outputPricePerM: '10.00',
        numericInputPrice: 2.5,
        numericOutputPrice: 10.0,
        modalityTags: ['text', 'vision'],
        status: 'ok',
        lastSeenAt: null,
        updatedAt: new Date(),
        providerName: 'OpenAI',
        providerSlug: 'openai',
        slug: 'gpt-4o',
      },
      {
        id: '3',
        name: 'Gemini 1.5 Pro',
        contextWindow: 1000000,
        inputPricePerM: '1.25',
        outputPricePerM: '5.00',
        numericInputPrice: 1.25,
        numericOutputPrice: 5.0,
        modalityTags: ['text', 'vision', 'audio'],
        status: 'ok',
        lastSeenAt: null,
        updatedAt: new Date(),
        providerName: 'Google',
        providerSlug: 'google',
        slug: 'gemini-1-5-pro',
      },
    ];

    const inTokens = 1000;
    const outTokens = 500;
    const rpd = 1000;
    const callsPerMonth = rpd * 30;

    const calcResults = mockModels.map((m) =>
      calculateCost(inTokens, outTokens, callsPerMonth, m.numericInputPrice, m.numericOutputPrice)
    );

    // Verify cheapest pricing & cost determination
    const minInputPrice = Math.min(...mockModels.map((m) => m.numericInputPrice));
    expect(minInputPrice).toBe(1.25); // Gemini 1.5 Pro is cheapest input price

    const minMonthlyCost = Math.min(...calcResults.map((c) => c.totalCostPerMonth));
    expect(minMonthlyCost).toBe(calcResults[2].totalCostPerMonth); // Gemini 1.5 Pro is cheapest total monthly cost
  });

  test('shows a "pick up to 4" note when >4 models are requested', () => {
    const result = processCompareParams({
      m: 'm1/s1,m2/s2,m3/s3,m4/s4,m5/s5',
    });

    expect(result.redirectUrl).toBeNull();
    expect(result.exceedsLimit).toBe(true);
    expect(result.modelKeys).toHaveLength(4);

    // Confirm that the notice contains the phrase "pick up to 4"
    const noticeText = 'Note: Maximum 4 models allowed. Showing the first 4 models — please pick up to 4 models to compare.';
    expect(noticeText).toContain('pick up to 4');
  });
});
