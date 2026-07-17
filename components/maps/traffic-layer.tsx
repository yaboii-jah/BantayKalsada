"use client";

import { HeatCanvas } from "@/components/maps/heat-layer";
import type { HeatPoint } from "@/lib/heatmap";

const TRAFFIC_GRADIENT = {
  0.0: "#16a34a",
  0.3: "#eab308",
  0.6: "#f97316",
  1.0: "#dc2626",
};

interface TrafficLayerProps {
  points: HeatPoint[];
}

export function TrafficLayer({ points }: TrafficLayerProps) {
  return (
    <HeatCanvas
      points={points}
      max={10}
      radius={35}
      blur={20}
      gradient={TRAFFIC_GRADIENT}
    />
  );
}
