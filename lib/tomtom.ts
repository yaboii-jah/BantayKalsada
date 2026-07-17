import { createAdminClient } from "@/lib/supabase/service-role";
import type { HeatPoint } from "@/lib/heatmap";

interface Point {
  lat: number;
  lng: number;
}

const TAYTAY_BBOX = {
  minLat: 14.48,
  maxLat: 14.58,
  minLng: 121.1,
  maxLng: 121.17,
};

const SPACING_DEG = 0.02;

function generateGrid(): Point[] {
  const points: Point[] = [];
  let lat = TAYTAY_BBOX.minLat;
  while (lat <= TAYTAY_BBOX.maxLat) {
    let lng = TAYTAY_BBOX.minLng;
    while (lng <= TAYTAY_BBOX.maxLng) {
      points.push({ lat: Number(lat.toFixed(4)), lng: Number(lng.toFixed(4)) });
      lng = Number((lng + SPACING_DEG).toFixed(4));
    }
    lat = Number((lat + SPACING_DEG).toFixed(4));
  }
  return points;
}

async function pMap<T, R>(
  items: T[],
  fn: (item: T, index: number) => Promise<R>,
  concurrency: number,
): Promise<R[]> {
  const results: R[] = [];
  for (let i = 0; i < items.length; i += concurrency) {
    const chunk = items.slice(i, i + concurrency);
    const chunkResults = await Promise.all(chunk.map((item, j) => fn(item, i + j)));
    results.push(...chunkResults);
  }
  return results;
}

interface TomTomFlowSegment {
  flowSegmentData: {
    jamFactor: number;
  };
}

async function fetchJamFactor(point: Point): Promise<number> {
  const url = `https://api.tomtom.com/traffic/services/4/flowSegmentData/absolute/Json?point=${point.lat},${point.lng}&unit=KMPH&key=${process.env.TOMTOM_API_KEY}`;

  const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
  if (!res.ok) {
    console.warn(`[tomtom] HTTP ${res.status} for ${point.lat},${point.lng}`);
    return 0;
  }

  const data: TomTomFlowSegment = await res.json();
  return data.flowSegmentData?.jamFactor ?? 0;
}

export async function buildTrafficGrid(): Promise<HeatPoint[]> {
  const apiKey = process.env.TOMTOM_API_KEY;
  if (!apiKey) return [];

  const grid = generateGrid();
  const jamFactors = await pMap(grid, (p) => fetchJamFactor(p), 5);

  return grid
    .map((p, i) => [p.lat, p.lng, jamFactors[i]] as HeatPoint)
    .filter((p) => p[2] > 0);
}

const CACHE_TTL_MS = 15 * 60 * 1000;
const CACHE_KEY = "taytay";

export async function getTrafficHeatPoints(): Promise<HeatPoint[]> {
  const apiKey = process.env.TOMTOM_API_KEY;
  if (!apiKey) return [];

  let cachedPoints: HeatPoint[] | null = null;

  try {
    const supabase = createAdminClient();
      const { data } = await supabase
        .from("traffic_cache" as any)
        .select("points, fetched_at")
        .eq("key", CACHE_KEY)
        .maybeSingle() as unknown as { data: { points: HeatPoint[]; fetched_at: string } | null };

    if (data) {
      const age = Date.now() - new Date(data.fetched_at).getTime();
      if (age < CACHE_TTL_MS) {
        cachedPoints = data.points as HeatPoint[];
      }
    }
  } catch {
    // Cache unavailable (table missing, network) — continue without cache
  }

  if (cachedPoints) return cachedPoints;

  try {
    const points = await buildTrafficGrid();

    try {
      const supabase = createAdminClient();
      await supabase
        .from("traffic_cache" as any)
        .upsert(
          { key: CACHE_KEY, points, fetched_at: new Date().toISOString() },
          { onConflict: "key" },
        );
    } catch {
      // Cache write failed — best-effort
    }

    return points;
  } catch (err) {
    console.error("[tomtom] Failed to build traffic grid:", err);
    return [];
  }
}
