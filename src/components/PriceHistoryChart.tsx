import React from 'react';
import { SnapshotPrice } from '../lib/price-history';

interface PriceChartProps {
  snapshots: SnapshotPrice[];
  width?: number;
  height?: number;
}

export function PriceHistoryChart({ snapshots, width = 600, height = 200 }: PriceChartProps) {
  if (snapshots.length === 0) {
    return null;
  }

  // Sort snapshots chronologically
  const sorted = [...snapshots].sort(
    (a, b) => new Date(a.capturedAt).getTime() - new Date(b.capturedAt).getTime()
  );

  const padding = { top: 20, right: 30, bottom: 40, left: 50 };
  const innerWidth = width - padding.left - padding.right;
  const innerHeight = height - padding.top - padding.bottom;

  // Extract values
  const points = sorted.map((s) => {
    const inputVal = typeof s.inputPricePerM === 'number' ? s.inputPricePerM : parseFloat(String(s.inputPricePerM).replace(/[^0-9.]/g, ''));
    const outputVal = typeof s.outputPricePerM === 'number' ? s.outputPricePerM : parseFloat(String(s.outputPricePerM).replace(/[^0-9.]/g, ''));
    const time = new Date(s.capturedAt).getTime();
    return {
      time,
      dateLabel: new Date(s.capturedAt).toISOString().split('T')[0],
      inputVal: isNaN(inputVal) ? 0 : inputVal,
      outputVal: isNaN(outputVal) ? 0 : outputVal,
    };
  });

  const minTime = points[0].time;
  const maxTime = points[points.length - 1].time;

  const allVals = points.flatMap((p) => [p.inputVal, p.outputVal]);
  let minVal = Math.min(...allVals);
  let maxVal = Math.max(...allVals);

  // If min and max are equal (or single snapshot), expand domain slightly
  if (minVal === maxVal) {
    minVal = Math.max(0, minVal - 1);
    maxVal = maxVal + 1;
  }

  const getX = (time: number) => {
    if (minTime === maxTime) return padding.left + innerWidth / 2;
    return padding.left + ((time - minTime) / (maxTime - minTime)) * innerWidth;
  };

  const getY = (val: number) => {
    return padding.top + innerHeight - ((val - minVal) / (maxVal - minVal)) * innerHeight;
  };

  const inputPointsStr = points.map((p) => `${getX(p.time)},${getY(p.inputVal)}`).join(' ');
  const outputPointsStr = points.map((p) => `${getX(p.time)},${getY(p.outputVal)}`).join(' ');

  const sameDay = points.every((p) => p.dateLabel === points[0].dateLabel);
  const tickLabel = (p: (typeof points)[number]) =>
    sameDay ? new Date(p.time).toISOString().slice(11, 16) + 'Z' : p.dateLabel;
  let lastLabelX = -Infinity;

  return (
    <div style={{ margin: '1rem 0' }}>
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', maxWidth: `${width}px`, height: 'auto', overflow: 'visible' }}>
        {/* Background grid / Y-axis guide lines */}
        <line x1={padding.left} y1={padding.top} x2={width - padding.right} y2={padding.top} stroke="#334155" strokeDasharray="4 4" />
        <line x1={padding.left} y1={padding.top + innerHeight / 2} x2={width - padding.right} y2={padding.top + innerHeight / 2} stroke="#334155" strokeDasharray="4 4" />
        <line x1={padding.left} y1={padding.top + innerHeight} x2={width - padding.right} y2={padding.top + innerHeight} stroke="#334155" />

        {/* Axes */}
        <line x1={padding.left} y1={padding.top} x2={padding.left} y2={padding.top + innerHeight} stroke="#475569" />

        {/* Labels for Y max and min */}
        <text x={padding.left - 8} y={padding.top + 4} textAnchor="end" fontSize="10" fill="#94a3b8">
          ${maxVal.toFixed(2)}
        </text>
        <text x={padding.left - 8} y={padding.top + innerHeight + 4} textAnchor="end" fontSize="10" fill="#94a3b8">
          ${minVal.toFixed(2)}
        </text>

        {/* Line for Input Price */}
        {points.length > 1 ? (
          <polyline fill="none" stroke="#2563eb" strokeWidth="2" points={inputPointsStr} />
        ) : null}

        {/* Line for Output Price */}
        {points.length > 1 ? (
          <polyline fill="none" stroke="#9333ea" strokeWidth="2" points={outputPointsStr} />
        ) : null}

        {/* Dots */}
        {points.map((p, idx) => (
          <g key={idx}>
            <circle cx={getX(p.time)} cy={getY(p.inputVal)} r="4" fill="#2563eb" />
            <circle cx={getX(p.time)} cy={getY(p.outputVal)} r="4" fill="#9333ea" />
            {/* X-axis labels — thinned to avoid overlap; HH:mm when all points share a day */}
            {(() => {
              const x = getX(p.time);
              if (x - lastLabelX < 60) return null;
              lastLabelX = x;
              return (
                <text x={x} y={padding.top + innerHeight + 16} textAnchor="middle" fontSize="10" fill="#94a3b8">
                  {tickLabel(p)}
                </text>
              );
            })()}
          </g>
        ))}
      </svg>
      <div style={{ display: 'flex', gap: '1.5rem', marginTop: '0.5rem', fontSize: '0.85rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
          <span style={{ display: 'inline-block', width: '12px', height: '12px', backgroundColor: '#2563eb', borderRadius: '2px' }} />
          <span>Input $/1M</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
          <span style={{ display: 'inline-block', width: '12px', height: '12px', backgroundColor: '#9333ea', borderRadius: '2px' }} />
          <span>Output $/1M</span>
        </div>
      </div>
    </div>
  );
}
