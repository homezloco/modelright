export interface ModelRow {
  id: string;
  name: string;
  slug: string;
  providerSlug?: string;
  providerName?: string;
  inputPricePerM: string | number;
  outputPricePerM: string | number;
  createdAt: Date | string;
}

export interface SnapshotRow {
  id: string;
  modelId: string;
  capturedAt: Date | string;
  availability: string;
  inputPricePerM: string | number;
  outputPricePerM: string | number;
}

export type ChangeEventType = 'new_model' | 'removed_model' | 'price_change';

export interface BaseChangeEvent {
  id: string;
  type: ChangeEventType;
  modelId: string;
  modelSlug: string;
  modelName: string;
  providerSlug?: string;
  providerName?: string;
  timestamp: Date;
}

export interface NewModelEvent extends BaseChangeEvent {
  type: 'new_model';
  initialInputPrice: number;
  initialOutputPrice: number;
}

export interface RemovedModelEvent extends BaseChangeEvent {
  type: 'removed_model';
}

export interface PriceChangeEvent extends BaseChangeEvent {
  type: 'price_change';
  oldInputPrice: number;
  newInputPrice: number;
  oldOutputPrice: number;
  newOutputPrice: number;
  inputPriceChangePercent: number; // e.g. -20 for 20% drop
  outputPriceChangePercent: number;
}

export type ChangeEvent = NewModelEvent | RemovedModelEvent | PriceChangeEvent;

export interface GroupedChanges {
  date: string; // YYYY-MM-DD
  events: ChangeEvent[];
}

function parsePrice(val: string | number): number {
  const num = typeof val === 'number' ? val : parseFloat(val);
  return isNaN(num) ? 0 : num;
}

function calcPercentChange(oldVal: number, newVal: number): number {
  if (oldVal === 0) {
    return newVal === 0 ? 0 : 100;
  }
  return Number((((newVal - oldVal) / oldVal) * 100).toFixed(2));
}

export function computeChangeEvents(
  models: ModelRow[],
  snapshots: SnapshotRow[],
  options: { now?: Date; days?: number } = {}
): ChangeEvent[] {
  const now = options.now ?? new Date();
  const days = options.days ?? 30;
  const cutoff = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

  const modelMap = new Map<string, ModelRow>();
  for (const m of models) {
    modelMap.set(m.id, m);
  }

  // Group snapshots by modelId, sorted by capturedAt ASC
  const snapshotsByModel = new Map<string, SnapshotRow[]>();
  for (const snap of snapshots) {
    const list = snapshotsByModel.get(snap.modelId) || [];
    list.push(snap);
    snapshotsByModel.set(snap.modelId, list);
  }

  for (const list of snapshotsByModel.values()) {
    list.sort((a, b) => new Date(a.capturedAt).getTime() - new Date(b.capturedAt).getTime());
  }

  const events: ChangeEvent[] = [];

  // 1. Check model creations (new_model)
  for (const model of models) {
    const createdAt = new Date(model.createdAt);
    if (createdAt >= cutoff && createdAt <= now) {
      events.push({
        id: `new-${model.id}-${createdAt.getTime()}`,
        type: 'new_model',
        modelId: model.id,
        modelSlug: model.slug,
        modelName: model.name,
        providerSlug: model.providerSlug,
        providerName: model.providerName,
        timestamp: createdAt,
        initialInputPrice: parsePrice(model.inputPricePerM),
        initialOutputPrice: parsePrice(model.outputPricePerM),
      });
    }
  }

  // 2. Check snapshot transitions for price changes and removal
  for (const [modelId, snaps] of snapshotsByModel.entries()) {
    const model = modelMap.get(modelId);
    const modelSlug = model?.slug ?? 'unknown';
    const modelName = model?.name ?? 'Unknown Model';
    const providerSlug = model?.providerSlug;
    const providerName = model?.providerName;

    for (let i = 1; i < snaps.length; i++) {
      const prev = snaps[i - 1];
      const curr = snaps[i];
      const timestamp = new Date(curr.capturedAt);

      if (timestamp < cutoff || timestamp > now) continue;

      // Check price change
      const prevIn = parsePrice(prev.inputPricePerM);
      const currIn = parsePrice(curr.inputPricePerM);
      const prevOut = parsePrice(prev.outputPricePerM);
      const currOut = parsePrice(curr.outputPricePerM);

      if (prevIn !== currIn || prevOut !== currOut) {
        events.push({
          id: `price-${curr.id}`,
          type: 'price_change',
          modelId,
          modelSlug,
          modelName,
          providerSlug,
          providerName,
          timestamp,
          oldInputPrice: prevIn,
          newInputPrice: currIn,
          oldOutputPrice: prevOut,
          newOutputPrice: currOut,
          inputPriceChangePercent: calcPercentChange(prevIn, currIn),
          outputPriceChangePercent: calcPercentChange(prevOut, currOut),
        });
      }

      // Check removal (transition from available to unavailable or status discontinued)
      if (prev.availability !== 'unavailable' && curr.availability === 'unavailable') {
        events.push({
          id: `removed-${curr.id}`,
          type: 'removed_model',
          modelId,
          modelSlug,
          modelName,
          providerSlug,
          providerName,
          timestamp,
        });
      }
    }
  }

  // Sort newest first
  events.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

  return events;
}

export interface PriceDropMover {
  modelId: string;
  modelSlug: string;
  modelName: string;
  providerSlug?: string;
  providerName?: string;
  /** Negative percent change, e.g. -20 for a 20% drop (largest drop across input/output). */
  percentChange: number;
  priceKind: 'input' | 'output';
  oldPrice: number;
  newPrice: number;
  timestamp: Date;
}

export interface NewestModelMover {
  modelId: string;
  modelSlug: string;
  modelName: string;
  providerSlug?: string;
  providerName?: string;
  timestamp: Date;
}

export interface WeeklyMovers {
  priceDrops: PriceDropMover[];
  newestModels: NewestModelMover[];
}

/**
 * Derives homepage "This week" movers from a change-event list.
 * Pure: filters events to the trailing `days` window ending at `now`,
 * then picks up to `limit` biggest price drops (most negative % change
 * across input/output, one entry per model) and up to `limit` newest models.
 */
export function deriveWeeklyMovers(
  events: ChangeEvent[],
  options: { now?: Date; days?: number; limit?: number } = {}
): WeeklyMovers {
  const now = options.now ?? new Date();
  const days = options.days ?? 7;
  const limit = options.limit ?? 5;
  const cutoff = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

  const inWindow = events.filter(
    (ev) => ev.timestamp >= cutoff && ev.timestamp <= now
  );

  const dropsByModel = new Map<string, PriceDropMover>();
  for (const ev of inWindow) {
    if (ev.type !== 'price_change') continue;

    const inPct = ev.inputPriceChangePercent;
    const outPct = ev.outputPriceChangePercent;
    const bestPct = Math.min(inPct, outPct);
    if (bestPct >= 0) continue;

    const useInput = inPct <= outPct;
    const mover: PriceDropMover = {
      modelId: ev.modelId,
      modelSlug: ev.modelSlug,
      modelName: ev.modelName,
      providerSlug: ev.providerSlug,
      providerName: ev.providerName,
      percentChange: bestPct,
      priceKind: useInput ? 'input' : 'output',
      oldPrice: useInput ? ev.oldInputPrice : ev.oldOutputPrice,
      newPrice: useInput ? ev.newInputPrice : ev.newOutputPrice,
      timestamp: ev.timestamp,
    };

    const existing = dropsByModel.get(ev.modelId);
    if (!existing || mover.percentChange < existing.percentChange) {
      dropsByModel.set(ev.modelId, mover);
    }
  }

  const priceDrops = [...dropsByModel.values()]
    .sort((a, b) =>
      a.percentChange - b.percentChange || b.timestamp.getTime() - a.timestamp.getTime()
    )
    .slice(0, limit);

  const seenNew = new Set<string>();
  const newestModels: NewestModelMover[] = [];
  const newEvents = inWindow
    .filter((ev): ev is NewModelEvent => ev.type === 'new_model')
    .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  for (const ev of newEvents) {
    if (seenNew.has(ev.modelId)) continue;
    seenNew.add(ev.modelId);
    newestModels.push({
      modelId: ev.modelId,
      modelSlug: ev.modelSlug,
      modelName: ev.modelName,
      providerSlug: ev.providerSlug,
      providerName: ev.providerName,
      timestamp: ev.timestamp,
    });
    if (newestModels.length >= limit) break;
  }

  return { priceDrops, newestModels };
}

/**
 * Returns the oldest timestamp observed across models and snapshots, or null
 * when the registry is empty. Callers hide weekly movers when this is less
 * than 7 days old (i.e. the registry has <7 days of history).
 */
export function earliestRegistryTimestamp(
  models: ModelRow[],
  snapshots: SnapshotRow[]
): Date | null {
  let earliest: number | null = null;
  for (const m of models) {
    const t = new Date(m.createdAt).getTime();
    if (!isNaN(t) && (earliest === null || t < earliest)) earliest = t;
  }
  for (const s of snapshots) {
    const t = new Date(s.capturedAt).getTime();
    if (!isNaN(t) && (earliest === null || t < earliest)) earliest = t;
  }
  return earliest === null ? null : new Date(earliest);
}

export function groupEventsByDay(events: ChangeEvent[]): GroupedChanges[] {
  const groups = new Map<string, ChangeEvent[]>();

  for (const ev of events) {
    const dateStr = ev.timestamp.toISOString().split('T')[0];
    const list = groups.get(dateStr) || [];
    list.push(ev);
    groups.set(dateStr, list);
  }

  const result: GroupedChanges[] = [];
  for (const [date, evs] of groups.entries()) {
    result.push({ date, events: evs });
  }

  result.sort((a, b) => b.date.localeCompare(a.date));
  return result;
}

export function generateRssFeed(events: ChangeEvent[], siteUrl: string = 'https://modelright.com'): string {
  const itemsXml = events.map((ev) => {
    let title = '';
    let description = '';

    if (ev.type === 'new_model') {
      title = `New Model: ${ev.modelName} (${ev.providerName || ev.providerSlug || 'Provider'})`;
      description = `Added model ${ev.modelName} with input price $${ev.initialInputPrice}/1M tokens and output price $${ev.initialOutputPrice}/1M tokens.`;
    } else if (ev.type === 'removed_model') {
      title = `Model Removed: ${ev.modelName}`;
      description = `Model ${ev.modelName} was marked unavailable or removed from active catalog.`;
    } else if (ev.type === 'price_change') {
      title = `Price Change: ${ev.modelName}`;
      const inStr = ev.oldInputPrice !== ev.newInputPrice ? `Input: $${ev.oldInputPrice} → $${ev.newInputPrice} (${ev.inputPriceChangePercent > 0 ? '+' : ''}${ev.inputPriceChangePercent}%)` : '';
      const outStr = ev.oldOutputPrice !== ev.newOutputPrice ? `Output: $${ev.oldOutputPrice} → $${ev.newOutputPrice} (${ev.outputPriceChangePercent > 0 ? '+' : ''}${ev.outputPriceChangePercent}%)` : '';
      description = [inStr, outStr].filter(Boolean).join(' | ');
    }

    const itemLink = `${siteUrl}/models/${ev.providerSlug || 'all'}/${ev.modelSlug}`;
    const pubDate = ev.timestamp.toUTCString();

    return `    <item>
      <title>${escapeXml(title)}</title>
      <link>${escapeXml(itemLink)}</link>
      <guid isPermaLink="false">${escapeXml(ev.id)}</guid>
      <pubDate>${pubDate}</pubDate>
      <description>${escapeXml(description)}</description>
    </item>`;
  }).join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Modelright Catalog Changes</title>
    <link>${siteUrl}/changes</link>
    <description>Latest AI model additions, price changes, and deprecations tracked over the last 30 days.</description>
    <language>en-us</language>
    <atom:link href="${siteUrl}/changes/rss.xml" rel="self" type="application/rss+xml" />
${itemsXml}
  </channel>
</rss>`;
}

function escapeXml(unsafe: string): string {
  return unsafe.replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '&': return '&amp;';
      case '\'': return '&apos;';
      case '"': return '&quot;';
      default: return c;
    }
  });
}
