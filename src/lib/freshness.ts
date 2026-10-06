export function formatFreshness(
  lastSyncedAt: Date | string | number | null | undefined,
  now: Date = new Date()
): string {
  if (!lastSyncedAt) {
    return 'Not synced yet';
  }

  const date = new Date(lastSyncedAt);
  if (isNaN(date.getTime())) {
    return 'Not synced yet';
  }

  const diffMs = Math.max(0, now.getTime() - date.getTime());
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  let relative = '';
  if (diffSecs < 60) {
    relative = 'just now';
  } else if (diffMins < 60) {
    relative = `${diffMins} minute${diffMins === 1 ? '' : 's'} ago`;
  } else if (diffHours < 24) {
    relative = `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
  } else {
    relative = `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
  }

  return `Data synced ${relative} from OpenRouter`;
}
