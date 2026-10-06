import { describe, test, expect } from 'vitest';
import { formatFreshness } from '../src/lib/freshness';

describe('formatFreshness', () => {
  test('returns "Not synced yet" when date is null or undefined', () => {
    expect(formatFreshness(null)).toBe('Not synced yet');
    expect(formatFreshness(undefined)).toBe('Not synced yet');
  });

  test('formats relative times correctly', () => {
    const now = new Date('2026-10-02T12:00:00Z');

    const justNow = new Date('2026-10-02T11:59:40Z');
    expect(formatFreshness(justNow, now)).toBe('Data synced just now from OpenRouter');

    const minsAgo = new Date('2026-10-02T11:45:00Z');
    expect(formatFreshness(minsAgo, now)).toBe('Data synced 15 minutes ago from OpenRouter');

    const hoursAgo = new Date('2026-10-02T09:00:00Z');
    expect(formatFreshness(hoursAgo, now)).toBe('Data synced 3 hours ago from OpenRouter');

    const daysAgo = new Date('2026-09-30T12:00:00Z');
    expect(formatFreshness(daysAgo, now)).toBe('Data synced 2 days ago from OpenRouter');
  });
});
