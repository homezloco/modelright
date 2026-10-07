'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';

export interface PickerModel {
  key: string; // `${providerSlug}/${slug}`
  name: string;
  providerName: string;
  status?: string;
}

const MAX = 4;
const LIST_LIMIT = 60;

export default function ComparePicker({
  models,
  initialSelected = [],
}: {
  models: PickerModel[];
  initialSelected?: string[];
}) {
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<string[]>(initialSelected.slice(0, MAX));

  const byKey = useMemo(() => new Map(models.map((m) => [m.key, m])), [models]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const pool = q
      ? models.filter(
          (m) =>
            m.name.toLowerCase().includes(q) ||
            m.providerName.toLowerCase().includes(q) ||
            m.key.toLowerCase().includes(q)
        )
      : models;
    return pool.slice(0, LIST_LIMIT);
  }, [models, query]);

  const toggle = (key: string) => {
    setSelected((cur) =>
      cur.includes(key) ? cur.filter((k) => k !== key) : cur.length < MAX ? [...cur, key] : cur
    );
  };

  const compareHref = `/compare?m=${encodeURIComponent(selected.join(','))}`;
  const ready = selected.length >= 2;
  const full = selected.length >= MAX;

  return (
    <div>
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search models by name or provider…"
        aria-label="Search models"
        style={{
          width: '100%',
          padding: '0.625rem 0.875rem',
          background: '#0f172a',
          border: '1px solid #334155',
          borderRadius: '6px',
          color: '#f8fafc',
          fontSize: '0.95rem',
          boxSizing: 'border-box',
          marginBottom: '0.75rem',
        }}
      />

      {selected.length > 0 && (
        <div data-testid="selection-chips" style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
          {selected.map((key) => {
            const m = byKey.get(key);
            return (
              <button
                key={key}
                type="button"
                onClick={() => toggle(key)}
                title="Remove"
                style={{
                  padding: '0.3rem 0.75rem',
                  background: '#1e3a5f',
                  border: '1px solid #38bdf8',
                  borderRadius: '9999px',
                  color: '#bae6fd',
                  fontSize: '0.8rem',
                  cursor: 'pointer',
                }}
              >
                {m?.name ?? key} ✕
              </button>
            );
          })}
        </div>
      )}

      <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginBottom: '0.5rem' }}>
        {selected.length}/{MAX} selected{full ? ' — remove one to pick another' : ''}
      </div>

      <div
        data-testid="model-list"
        style={{
          maxHeight: '320px',
          overflowY: 'auto',
          border: '1px solid #334155',
          borderRadius: '6px',
          background: '#0f172a',
        }}
      >
        {filtered.length === 0 ? (
          <div style={{ padding: '1rem', color: '#94a3b8', fontSize: '0.875rem' }}>
            No models match “{query}”.
          </div>
        ) : (
          filtered.map((m) => {
            const isSel = selected.includes(m.key);
            return (
              <button
                key={m.key}
                type="button"
                onClick={() => toggle(m.key)}
                disabled={!isSel && full}
                aria-pressed={isSel}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  width: '100%',
                  padding: '0.5rem 0.875rem',
                  background: isSel ? '#1e3a5f' : 'transparent',
                  border: 'none',
                  borderBottom: '1px solid #1e293b',
                  color: isSel ? '#bae6fd' : '#e2e8f0',
                  fontSize: '0.875rem',
                  cursor: !isSel && full ? 'not-allowed' : 'pointer',
                  textAlign: 'left',
                  opacity: !isSel && full ? 0.5 : 1,
                }}
              >
                <span>
                  {isSel ? '✓ ' : ''}
                  {m.name}
                </span>
                <span style={{ color: '#64748b', fontSize: '0.8rem' }}>{m.providerName}</span>
              </button>
            );
          })
        )}
      </div>

      <div style={{ marginTop: '1rem' }}>
        <Link
          href={ready ? compareHref : '#'}
          aria-disabled={!ready}
          data-testid="compare-link"
          style={{
            display: 'inline-block',
            padding: '0.625rem 1.25rem',
            background: ready ? '#0284c7' : '#1e293b',
            border: '1px solid #334155',
            borderRadius: '6px',
            color: ready ? '#fff' : '#64748b',
            textDecoration: 'none',
            fontSize: '0.9rem',
            fontWeight: 600,
            pointerEvents: ready ? 'auto' : 'none',
          }}
        >
          Compare {selected.length > 0 ? `${selected.length} ` : ''}model{selected.length === 1 ? '' : 's'} →
        </Link>
        {!ready && (
          <span style={{ marginLeft: '0.75rem', fontSize: '0.8rem', color: '#64748b' }}>
            pick at least 2
          </span>
        )}
      </div>
    </div>
  );
}
