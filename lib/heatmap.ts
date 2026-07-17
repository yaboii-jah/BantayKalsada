export type HeatPoint = [number, number, number];

const SEVERITY_WEIGHT: Record<string, number> = {
  MINOR: 1,
  URGENT: 2,
  EMERGENCY: 3,
};

export function severityWeight(severity: string | null | undefined): number {
  if (!severity) return 1;
  return SEVERITY_WEIGHT[severity] ?? 1;
}

/**
 * External traffic-intensity heat source (Phase B).
 *
 * Returns an empty array for now. When the user specifies a traffic API
 * provider (e.g. TomTom/HERE/Google) and supplies keys, implement this as a
 * server-side fetch (proxy) that normalises the provider response into
 * HeatPoint tuples ([lat, lng, intensity]) and merges them into the heatmap.
 *
 * Intentionally async + returns [] so the heatmap UI can call it without
 * branching on whether the external source is wired up yet.
 */
export async function getExternalHeatPoints(): Promise<HeatPoint[]> {
  return [];
}
