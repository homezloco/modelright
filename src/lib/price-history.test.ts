import { it } from 'vitest';
import assert from 'node:assert';
import { getPriceChanges, hasRecentPriceChange, SnapshotPrice } from './price-history';


it('no price change detected when prices are constant', () => {
  const snapshots: SnapshotPrice[] = [
    { id: '1', capturedAt: '2026-10-01T10:00:00Z', inputPricePerM: '$2.50', outputPricePerM: '$10.00' },
    { id: '2', capturedAt: '2026-10-02T10:00:00Z', inputPricePerM: '$2.50', outputPricePerM: '$10.00' },
  ];
  const changes = getPriceChanges(snapshots);
  assert.ok(changes.length === 0, `Expected 0 changes, got ${changes.length}`);
});

it('detects a single price drop', () => {
  const snapshots: SnapshotPrice[] = [
    { id: '1', capturedAt: '2026-10-01T10:00:00Z', inputPricePerM: '$3.00', outputPricePerM: '$15.00' },
    { id: '2', capturedAt: '2026-10-02T10:00:00Z', inputPricePerM: '$2.50', outputPricePerM: '$10.00' },
  ];
  const changes = getPriceChanges(snapshots);
  assert.ok(changes.length === 1, `Expected 1 change, got ${changes.length}`);
  assert.ok(changes[0].inputFrom === 3.0, 'inputFrom mismatch');
  assert.ok(changes[0].inputTo === 2.5, 'inputTo mismatch');
  assert.ok(changes[0].outputFrom === 15.0, 'outputFrom mismatch');
  assert.ok(changes[0].outputTo === 10.0, 'outputTo mismatch');
});

it('detects a single price rise', () => {
  const snapshots: SnapshotPrice[] = [
    { id: '1', capturedAt: '2026-10-01T10:00:00Z', inputPricePerM: '$2.00', outputPricePerM: '$8.00' },
    { id: '2', capturedAt: '2026-10-03T10:00:00Z', inputPricePerM: '$2.50', outputPricePerM: '$10.00' },
  ];
  const changes = getPriceChanges(snapshots);
  assert.ok(changes.length === 1, `Expected 1 change, got ${changes.length}`);
  assert.ok(changes[0].inputFrom === 2.0, 'inputFrom mismatch');
  assert.ok(changes[0].inputTo === 2.5, 'inputTo mismatch');
  assert.ok(changes[0].outputFrom === 8.0, 'outputFrom mismatch');
  assert.ok(changes[0].outputTo === 10.0, 'outputTo mismatch');
});

it('hasRecentPriceChange flags recent and ignores old changes', () => {
  const now = new Date('2026-10-06T12:00:00Z');
  const recentSnapshots: SnapshotPrice[] = [
    { id: '1', capturedAt: '2026-10-01T10:00:00Z', inputPricePerM: '$2.00', outputPricePerM: '$8.00' },
    { id: '2', capturedAt: '2026-10-04T10:00:00Z', inputPricePerM: '$2.50', outputPricePerM: '$10.00' },
  ];
  const oldSnapshots: SnapshotPrice[] = [
    { id: '1', capturedAt: '2026-09-01T10:00:00Z', inputPricePerM: '$2.00', outputPricePerM: '$8.00' },
    { id: '2', capturedAt: '2026-09-10T10:00:00Z', inputPricePerM: '$2.50', outputPricePerM: '$10.00' },
  ];

  assert.ok(hasRecentPriceChange(recentSnapshots, 7, now) === true, 'Expected recent change to be true');
  assert.ok(hasRecentPriceChange(oldSnapshots, 7, now) === false, 'Expected old change to be false');
});

