"use client";

import { useEffect } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { HeatPoint } from "@/lib/heatmap";

export const HEAT_GRADIENT = {
  0.2: "#3b82f6",
  0.4: "#22d3ee",
  0.6: "#f59e0b",
  0.8: "#f97316",
  1.0: "#dc2626",
};

interface HeatCanvasProps {
  points: HeatPoint[];
  max: number;
  radius: number;
  blur: number;
  gradient: Record<number, string>;
}

export function HeatCanvas({ points, max, radius, blur, gradient }: HeatCanvasProps) {
  const map = useMap();

  useEffect(() => {
    let cancelled = false;
    let layer: L.Layer | null = null;

    async function init() {
      if (typeof window !== "undefined") {
        (window as unknown as { L: typeof L }).L = L;
      }

      await import("leaflet.heat");

      const LL = (window as unknown as { L?: typeof L }).L ?? L;
      const heatLayerFn = (
        LL as unknown as {
          heatLayer?: (pts: HeatPoint[], opts: object) => L.Layer;
        }
      ).heatLayer;

      if (typeof heatLayerFn !== "function" || cancelled) return;

      layer = heatLayerFn(points, {
        radius,
        blur,
        max,
        gradient,
      });
      layer.addTo(map);
    }

    init();

    return () => {
      cancelled = true;
      if (layer) map.removeLayer(layer);
    };
  }, [map, points, max, radius, blur, gradient]);

  return null;
}

interface HeatLayerProps {
  points: HeatPoint[];
  max?: number;
}

export function HeatLayer({ points, max = 3 }: HeatLayerProps) {
  return (
    <HeatCanvas
      points={points}
      max={max}
      radius={30}
      blur={20}
      gradient={HEAT_GRADIENT}
    />
  );
}
