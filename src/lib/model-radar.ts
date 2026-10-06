export interface RadarScore {
  model: string;
  score: number;
  latencyMs: number;
  tokensIn?: number;
  tokensOut?: number;
  notes?: string;
  estCostUsd?: number;
}

export interface ModelRadarFeed {
  publishedAt: string;
  bench?: { scores?: RadarScore[] };
}

const RADAR_URL = 'https://api.livegraph.ai/public/model-radar';

export function findRadarScore(
  feed: ModelRadarFeed | null,
  provider: string,
  slug: string
): RadarScore | null {
  if (!feed?.bench?.scores) return null;
  const id = `${provider}/${slug}`.toLowerCase();
  return feed.bench.scores.find((s) => s.model?.toLowerCase() === id) ?? null;
}

export async function fetchModelRadar(
  fetcher: typeof fetch = fetch
): Promise<ModelRadarFeed | null> {
  try {
    const res = await fetcher(RADAR_URL, { next: { revalidate: 3600 } } as RequestInit);
    if (!res.ok) return null;
    return (await res.json()) as ModelRadarFeed;
  } catch {
    return null;
  }
}
