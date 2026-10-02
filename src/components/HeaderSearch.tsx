'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface SearchResult {
  id?: string;
  name: string;
  slug: string;
  providerName: string;
  providerSlug: string;
}

export default function HeaderSearch() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    const timer = setTimeout(() => {
      if (query.trim()) {
        setIsLoading(true);
        fetch(`/api/models/search?q=${encodeURIComponent(query.trim())}`)
          .then((res) => res.json())
          .then((data) => {
            setResults(data.results || []);
            setIsLoading(false);
            setIsOpen(true);
          })
          .catch((err) => {
            console.error('Search error:', err);
            setIsLoading(false);
          });
      } else {
        setResults([]);
        setIsOpen(false);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [query]);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (providerSlug: string, slug: string) => {
    setIsOpen(false);
    setQuery('');
    router.push(`/models/${providerSlug}/${slug}`);
  };

  return (
    <div ref={dropdownRef} style={{ position: 'relative', width: '240px' }}>
      <input
        type="text"
        placeholder="Search models or providers..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => {
          if (results.length > 0) setIsOpen(true);
        }}
        style={{
          width: '100%',
          padding: '0.4rem 0.75rem',
          borderRadius: '0.375rem',
          border: '1px solid #334155',
          backgroundColor: '#1e293b',
          color: '#f8fafc',
          fontSize: '0.875rem',
          outline: 'none',
          boxSizing: 'border-box',
        }}
      />
      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            marginTop: '0.5rem',
            backgroundColor: '#1e293b',
            border: '1px solid #334155',
            borderRadius: '0.375rem',
            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.5)',
            maxHeight: '300px',
            overflowY: 'auto',
            zIndex: 50,
          }}
        >
          {isLoading && (
            <div style={{ padding: '0.75rem', color: '#94a3b8', fontSize: '0.875rem', textAlign: 'center' }}>
              Searching...
            </div>
          )}
          {!isLoading && results.length === 0 && (
            <div style={{ padding: '0.75rem', color: '#94a3b8', fontSize: '0.875rem', textAlign: 'center' }}>
              No models found
            </div>
          )}
          {!isLoading &&
            results.map((item) => (
              <div
                key={`${item.providerSlug}/${item.slug}`}
                onClick={() => handleSelect(item.providerSlug, item.slug)}
                style={{
                  padding: '0.5rem 0.75rem',
                  cursor: 'pointer',
                  borderBottom: '1px solid #334155',
                  transition: 'background-color 0.15s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#334155';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                <div style={{ fontWeight: 600, color: '#f8fafc', fontSize: '0.875rem' }}>{item.name}</div>
                <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{item.providerName}</div>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}
