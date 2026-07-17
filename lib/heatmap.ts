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
