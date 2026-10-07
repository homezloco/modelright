/**
 * Generic relative-age formatter: "just now", "15 minutes ago",
 * "3 hours ago", "2 days ago". Returns '' for null/invalid input.
 */
export function formatAge(
  date: Date | string | number | null | undefined,
  now: Date = new Date()
): string {
  if (!date) {
    return '';
  }

  const d = new Date(date);
  if (isNaN(d.getTime())) {
    return '';
  }

  const diffMs = Math.max(0, now.getTime() - d.getTime());
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSecs < 60) {
    return 'just now';
  } else if (diffMins < 60) {
    return `${diffMins} minute${diffMins === 1 ? '' : 's'} ago`;
  } else if (diffHours < 24) {
    return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
  } else {
    return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
  }
}

export function formatFreshness(
  lastSyncedAt: Date | string | number | null | undefined,
  now: Date = new Date()
): string {
  const relative = formatAge(lastSyncedAt, now);
  if (!relative) {
    return 'Not synced yet';
  }

  return `Data synced ${relative} from OpenRouter`;
}
