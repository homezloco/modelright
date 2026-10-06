export interface SnapshotPrice {
  id: string;
  capturedAt: string | Date;
  inputPricePerM: string | number;
  outputPricePerM: string | number;
}

export interface PriceChange {
  id: string;
  date: string; // YYYY-MM-DD
  inputFrom: number;
  inputTo: number;
  outputFrom: number;
  outputTo: number;
  inputChanged: boolean;
  outputChanged: boolean;
}

/**
 * Extracts price change events from a list of snapshots ordered by capture time (ascending or descending).
 * We normalize sorting to ascending by time before extracting changes.
 */
export function getPriceChanges(snapshots: SnapshotPrice[]): PriceChange[] {
  if (snapshots.length <= 1) {
    return [];
  }

  // Sort chronologically ascending
  const sorted = [...snapshots].sort((a, b) => {
    const timeA = new Date(a.capturedAt).getTime();
    const timeB = new Date(b.capturedAt).getTime();
    return timeA - timeB;
  });

  const changes: PriceChange[] = [];

  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1];
    const curr = sorted[i];

    const prevInput = typeof prev.inputPricePerM === 'number' ? prev.inputPricePerM : parseFloat(String(prev.inputPricePerM).replace(/[^0-9.]/g, ''));
    const currInput = typeof curr.inputPricePerM === 'number' ? curr.inputPricePerM : parseFloat(String(curr.inputPricePerM).replace(/[^0-9.]/g, ''));

    const prevOutput = typeof prev.outputPricePerM === 'number' ? prev.outputPricePerM : parseFloat(String(prev.outputPricePerM).replace(/[^0-9.]/g, ''));
    const currOutput = typeof curr.outputPricePerM === 'number' ? curr.outputPricePerM : parseFloat(String(curr.outputPricePerM).replace(/[^0-9.]/g, ''));

    const inputChanged = prevInput !== currInput;
    const outputChanged = prevOutput !== currOutput;

    if (inputChanged || outputChanged) {
      const dateStr = new Date(curr.capturedAt).toISOString().split('T')[0];
      changes.push({
        id: curr.id,
        date: dateStr,
        inputFrom: prevInput,
        inputTo: currInput,
        outputFrom: prevOutput,
        outputTo: currOutput,
        inputChanged,
        outputChanged,
      });
    }
  }

  return changes;
}

/**
 * Checks if a model has had a price change in the last N days (default 7 days).
 */
export function hasRecentPriceChange(snapshots: SnapshotPrice[], days = 7, now = new Date()): boolean {
  const changes = getPriceChanges(snapshots);
  if (changes.length === 0) return false;

  const cutoff = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

  return changes.some((change) => {
    const changeDate = new Date(change.date);
    return changeDate >= cutoff;
  });
}
