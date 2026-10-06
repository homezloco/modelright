import test from 'node:test';
import assert from 'node:assert';
import { computeChangeEvents, groupEventsByDay, generateRssFeed, ModelRow, SnapshotRow } from './changes';

test('computeChangeEvents detects new models, price changes, and model removals', () => {
  const now = new Date('2026-10-06T12:00:00Z');

  const sampleModels: ModelRow[] = [
    {
      id: 'm1',
      name: 'GPT-4o',
      slug: 'gpt-4o',
      providerSlug: 'openai',
      providerName: 'OpenAI',
      inputPricePerM: '2.50',
      outputPricePerM: '10.00',
      createdAt: new Date('2026-10-05T10:00:00Z'),
    },
    {
      id: 'm2',
      name: 'Claude 3.5 Sonnet',
      slug: 'claude-3-5-sonnet',
      providerSlug: 'anthropic',
      providerName: 'Anthropic',
      inputPricePerM: '3.00',
      outputPricePerM: '15.00',
      createdAt: new Date('2026-09-01T00:00:00Z'), // Outside 30 day cutoff for creation
    },
  ];

  const sampleSnapshots: SnapshotRow[] = [
    // m2 price reduction
    {
      id: 's1',
      modelId: 'm2',
      capturedAt: new Date('2026-10-01T10:00:00Z'),
      availability: 'available',
      inputPricePerM: '3.00',
      outputPricePerM: '15.00',
    },
    {
      id: 's2',
      modelId: 'm2',
      capturedAt: new Date('2026-10-04T10:00:00Z'),
      availability: 'available',
      inputPricePerM: '2.40', // 20% drop
      outputPricePerM: '12.00', // 20% drop
    },
    // m2 removal
    {
      id: 's3',
      modelId: 'm2',
      capturedAt: new Date('2026-10-06T08:00:00Z'),
      availability: 'unavailable',
      inputPricePerM: '2.40',
      outputPricePerM: '12.00',
    },
  ];

  const events = computeChangeEvents(sampleModels, sampleSnapshots, { now, days: 30 });

  assert.strictEqual(events.length, 3, 'Should produce 3 events');

  // Newest first
  const [e1, e2, e3] = events;

  assert.strictEqual(e1.type, 'removed_model');
  assert.strictEqual(e1.modelId, 'm2');

  assert.strictEqual(e2.type, 'new_model');
  assert.strictEqual(e2.modelId, 'm1');

  assert.strictEqual(e3.type, 'price_change');
  assert.strictEqual(e3.modelId, 'm2');
  if (e3.type === 'price_change') {
    assert.strictEqual(e3.oldInputPrice, 3.00);
    assert.strictEqual(e3.newInputPrice, 2.40);
    assert.strictEqual(e3.inputPriceChangePercent, -20);
  }

  // Test grouping by day
  const grouped = groupEventsByDay(events);
  assert.strictEqual(grouped.length, 3);
  assert.strictEqual(grouped[0].date, '2026-10-06');
  assert.strictEqual(grouped[1].date, '2026-10-05');
  assert.strictEqual(grouped[2].date, '2026-10-04');

  // Test RSS XML generation
  const rssXml = generateRssFeed(events, 'https://modelright.com');
  assert.ok(rssXml.startsWith('<?xml version="1.0" encoding="UTF-8"?>'));
  assert.ok(rssXml.includes('<rss version="2.0"'));
  assert.ok(rssXml.includes('<title>Modelright Catalog Changes</title>'));
  assert.ok(rssXml.includes('<title>New Model: GPT-4o (OpenAI)</title>'));
  assert.ok(rssXml.includes('Input: $3 → $2.4 (-20%)'));
});
