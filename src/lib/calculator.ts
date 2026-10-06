export interface CostCalculation {
  inputCostPerCall: number;
  outputCostPerCall: number;
  totalCostPerCall: number;
  inputCostPerMonth: number;
  outputCostPerMonth: number;
  totalCostPerMonth: number;
}

export function calculateCost(
  inputTokensPerCall: number,
  outputTokensPerCall: number,
  callsPerMonth: number,
  inputPricePerM: number,
  outputPricePerM: number
): CostCalculation {
  const safeInputTokens = Math.max(0, Number(inputTokensPerCall) || 0);
  const safeOutputTokens = Math.max(0, Number(outputTokensPerCall) || 0);
  const safeCalls = Math.max(0, Number(callsPerMonth) || 0);
  const safeInputPrice = Math.max(0, Number(inputPricePerM) || 0);
  const safeOutputPrice = Math.max(0, Number(outputPricePerM) || 0);

  const inputCostPerCall = (safeInputTokens / 1_000_000) * safeInputPrice;
  const outputCostPerCall = (safeOutputTokens / 1_000_000) * safeOutputPrice;
  const totalCostPerCall = inputCostPerCall + outputCostPerCall;

  const inputCostPerMonth = inputCostPerCall * safeCalls;
  const outputCostPerMonth = outputCostPerCall * safeCalls;
  const totalCostPerMonth = totalCostPerCall * safeCalls;

  return {
    inputCostPerCall,
    outputCostPerCall,
    totalCostPerCall,
    inputCostPerMonth,
    outputCostPerMonth,
    totalCostPerMonth,
  };
}
