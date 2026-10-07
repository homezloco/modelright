import Link from 'next/link';
import type { CSSProperties } from 'react';
import { calculateCost } from '@/lib/calculator';
import { ModelItem, getCheapestIndices } from '@/lib/compare';

const cell: CSSProperties = { padding: '0.75rem 1rem' };
const rowStyle: CSSProperties = { borderBottom: '1px solid #334155' };

export default function CompareTable({
  selectedModels,
  inputTokens = 1000,
  outputTokens = 500,
  rpd = 1000,
}: {
  selectedModels: ModelItem[];
  inputTokens?: number;
  outputTokens?: number;
  rpd?: number;
}) {
  const callsPerMonth = rpd * 30;
  const inputPrices = selectedModels.map((m) => parseFloat(m.inputPricePerM) || 0);
  const outputPrices = selectedModels.map((m) => parseFloat(m.outputPricePerM) || 0);
  const cheapestInputIndices = getCheapestIndices(inputPrices);
  const cheapestOutputIndices = getCheapestIndices(outputPrices);

  const calculatedCosts = selectedModels.map((m) =>
    calculateCost(
      inputTokens,
      outputTokens,
      callsPerMonth,
      parseFloat(m.inputPricePerM) || 0,
      parseFloat(m.outputPricePerM) || 0
    )
  );
  const cheapestMonthIndices = getCheapestIndices(calculatedCosts.map((c) => c.totalCostPerMonth));

  const cheapestCell = (isCheapest: boolean): CSSProperties => ({
    ...cell,
    backgroundColor: isCheapest ? 'rgba(34, 197, 94, 0.15)' : 'transparent',
    fontWeight: isCheapest ? 700 : 400,
    color: isCheapest ? '#4ade80' : 'inherit',
  });

  return (
    <table
      style={{
        width: '100%',
        borderCollapse: 'collapse',
        border: '1px solid #334155',
        textAlign: 'left',
        marginBottom: '2rem',
      }}
    >
      <thead>
        <tr style={{ backgroundColor: '#1e293b', borderBottom: '1px solid #334155' }}>
          <th style={{ ...cell, width: '25%' }}>Spec / Metric</th>
          {selectedModels.map((m) => (
            <th key={m.id} style={cell}>
              <Link href={`/models/${m.providerSlug}/${m.slug}`} style={{ color: '#38bdf8', textDecoration: 'none' }}>
                {m.name}
              </Link>
              <div style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 400 }}>{m.providerName}</div>
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        <tr style={rowStyle}>
          <td style={{ ...cell, fontWeight: 600 }}>Provider</td>
          {selectedModels.map((m) => (
            <td key={m.id} style={cell}>{m.providerName}</td>
          ))}
        </tr>
        <tr style={rowStyle}>
          <td style={{ ...cell, fontWeight: 600 }}>Context Window</td>
          {selectedModels.map((m) => (
            <td key={m.id} style={cell}>
              {m.contextWindow ? m.contextWindow.toLocaleString() : 'N/A'}
            </td>
          ))}
        </tr>
        <tr style={rowStyle}>
          <td style={{ ...cell, fontWeight: 600 }}>Input Price / 1M</td>
          {selectedModels.map((m, idx) => (
            <td key={m.id} style={cheapestCell(cheapestInputIndices.includes(idx))}>
              ${m.inputPricePerM} {cheapestInputIndices.includes(idx) && '★'}
            </td>
          ))}
        </tr>
        <tr style={rowStyle}>
          <td style={{ ...cell, fontWeight: 600 }}>Output Price / 1M</td>
          {selectedModels.map((m, idx) => (
            <td key={m.id} style={cheapestCell(cheapestOutputIndices.includes(idx))}>
              ${m.outputPricePerM} {cheapestOutputIndices.includes(idx) && '★'}
            </td>
          ))}
        </tr>
        <tr style={rowStyle}>
          <td style={{ ...cell, fontWeight: 600 }}>Est. Cost / Month ({rpd} rpd)</td>
          {selectedModels.map((m, idx) => (
            <td key={m.id} style={cheapestCell(cheapestMonthIndices.includes(idx))}>
              ${calculatedCosts[idx].totalCostPerMonth.toFixed(2)}{' '}
              {cheapestMonthIndices.includes(idx) && '★'}
            </td>
          ))}
        </tr>
        <tr style={rowStyle}>
          <td style={{ ...cell, fontWeight: 600 }}>Modalities</td>
          {selectedModels.map((m) => (
            <td key={m.id} style={cell}>
              {m.modalityTags && m.modalityTags.length > 0 ? m.modalityTags.join(', ') : 'text'}
            </td>
          ))}
        </tr>
      </tbody>
    </table>
  );
}
