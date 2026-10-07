'use client';

import { useState } from 'react';
import { calculateCost } from '@/lib/calculator';

interface CostCalculatorProps {
  initialInputPricePerM?: number;
  initialOutputPricePerM?: number;
  modelName?: string;
}

export function CostCalculator({
  initialInputPricePerM = 2.5,
  initialOutputPricePerM = 10.0,
  modelName,
}: CostCalculatorProps) {
  const [inputTokens, setInputTokens] = useState<number>(1000);
  const [outputTokens, setOutputTokens] = useState<number>(500);
  const [callsPerMonth, setCallsPerMonth] = useState<number>(10000);
  const [inputPrice, setInputPrice] = useState<number>(initialInputPricePerM);
  const [outputPrice, setOutputPrice] = useState<number>(initialOutputPricePerM);

  const calc = calculateCost(inputTokens, outputTokens, callsPerMonth, inputPrice, outputPrice);

  return (
    <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', padding: '1.5rem', color: '#f8fafc' }}>
      <h3 style={{ fontSize: '1.2rem', fontWeight: 600, marginTop: 0, marginBottom: '1rem', color: '#38bdf8' }}>
        {modelName ? `Cost Calculator — ${modelName}` : 'AI Model Cost Calculator'}
      </h3>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        <div>
          <label style={{ display: 'block', fontSize: '0.85rem', color: '#94a3b8', marginBottom: '0.25rem' }}>
            Input Tokens / Call
          </label>
          <input
            type="number"
            min="0"
            value={inputTokens}
            onChange={(e) => setInputTokens(Number(e.target.value))}
            style={{ width: '100%', padding: '0.5rem', background: '#0f172a', border: '1px solid #475569', borderRadius: '4px', color: '#fff' }}
          />
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '0.85rem', color: '#94a3b8', marginBottom: '0.25rem' }}>
            Output Tokens / Call
          </label>
          <input
            type="number"
            min="0"
            value={outputTokens}
            onChange={(e) => setOutputTokens(Number(e.target.value))}
            style={{ width: '100%', padding: '0.5rem', background: '#0f172a', border: '1px solid #475569', borderRadius: '4px', color: '#fff' }}
          />
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '0.85rem', color: '#94a3b8', marginBottom: '0.25rem' }}>
            Est. Calls / Month
          </label>
          <input
            type="number"
            min="0"
            value={callsPerMonth}
            onChange={(e) => setCallsPerMonth(Number(e.target.value))}
            style={{ width: '100%', padding: '0.5rem', background: '#0f172a', border: '1px solid #475569', borderRadius: '4px', color: '#fff' }}
          />
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '0.85rem', color: '#94a3b8', marginBottom: '0.25rem' }}>
            Input Price / 1M Tokens ($)
          </label>
          <input
            type="number"
            min="0"
            step="0.01"
            value={inputPrice}
            onChange={(e) => setInputPrice(Number(e.target.value))}
            style={{ width: '100%', padding: '0.5rem', background: '#0f172a', border: '1px solid #475569', borderRadius: '4px', color: '#fff' }}
          />
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '0.85rem', color: '#94a3b8', marginBottom: '0.25rem' }}>
            Output Price / 1M Tokens ($)
          </label>
          <input
            type="number"
            min="0"
            step="0.01"
            value={outputPrice}
            onChange={(e) => setOutputPrice(Number(e.target.value))}
            style={{ width: '100%', padding: '0.5rem', background: '#0f172a', border: '1px solid #475569', borderRadius: '4px', color: '#fff' }}
          />
        </div>
      </div>

      <div style={{ background: '#0f172a', padding: '1rem', borderRadius: '6px', border: '1px solid #334155' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
          <div>
            <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Input Cost / Month</div>
            <div style={{ fontSize: '1.1rem', fontWeight: '600', color: '#f8fafc' }}>
              ${calc.inputCostPerMonth.toFixed(4)}
            </div>
          </div>
          <div>
            <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Output Cost / Month</div>
            <div style={{ fontSize: '1.1rem', fontWeight: '600', color: '#f8fafc' }}>
              ${calc.outputCostPerMonth.toFixed(4)}
            </div>
          </div>
          <div>
            <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Total Cost / Month</div>
            <div style={{ fontSize: '1.3rem', fontWeight: '700', color: '#38bdf8' }}>
              ${calc.totalCostPerMonth.toFixed(2)}
            </div>
          </div>
        </div>
        <div style={{ marginTop: '0.75rem', fontSize: '0.8rem', color: '#64748b' }}>
          Per call breakdown: ${calc.inputCostPerCall.toFixed(6)} input + ${calc.outputCostPerCall.toFixed(6)} output = ${calc.totalCostPerCall.toFixed(6)} total/call
        </div>
      </div>
    </div>
  );
}
