import { describe, test, expect } from 'vitest';
import { calculateCost } from '../src/lib/calculator';

describe('calculateCost', () => {
  test('calculates exact cost for 1M input and 500k output tokens', () => {
    // Input price $2.50 / 1M, Output price $10.00 / 1M
    // 1M input = $2.50 per call
    // 500k output = 0.5 * $10.00 = $5.00 per call
    // Total per call = $7.50
    // 100 calls/month = $750.00
    const result = calculateCost(1_000_000, 500_000, 100, 2.50, 10.00);

    expect(result.inputCostPerCall).toBeCloseTo(2.50);
    expect(result.outputCostPerCall).toBeCloseTo(5.00);
    expect(result.totalCostPerCall).toBeCloseTo(7.50);
    expect(result.inputCostPerMonth).toBeCloseTo(250.00);
    expect(result.outputCostPerMonth).toBeCloseTo(500.00);
    expect(result.totalCostPerMonth).toBeCloseTo(750.00);
  });

  test('handles zero token volume or zero price safely', () => {
    const zeroTokens = calculateCost(0, 0, 100, 5.0, 15.0);
    expect(zeroTokens.totalCostPerCall).toBe(0);
    expect(zeroTokens.totalCostPerMonth).toBe(0);

    const zeroPrice = calculateCost(100_000, 50_000, 10, 0, 0);
    expect(zeroPrice.totalCostPerCall).toBe(0);
    expect(zeroPrice.totalCostPerMonth).toBe(0);
  });

  test('handles negative values or invalid numeric inputs gracefully', () => {
    const negativeInput = calculateCost(-100, -50, -10, -5, -10);
    expect(negativeInput.totalCostPerMonth).toBe(0);
  });
});
