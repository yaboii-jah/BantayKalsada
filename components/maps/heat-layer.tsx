"use client";

import { useEffect } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { HeatPoint } from "@/lib/heatmap";

interface HeatLayerProps {
  points: HeatPoint[];
  max?: number;
}

// Continuous blue -> amber -> red ramp. Hardcoded hex is an allowed exception
// to the "no hardcoded colors" rule: heatmap gradients require a continuous
// color scale, same precedent as the TaytayBoundary polygon fill.
const HEAT_GRADIENT = {
  0.2: "#3b82f6",
  0.4: "#22d3ee",
  0.6: "#f59e0b",
  0.8: "#f97316",
  1.0: "#dc2626",
};

export function HeatLayer({ points, max = 3 }: HeatLayerProps) {
  const map = useMap();

  useEffect(() => {
    let cancelled = false;
    let layer: L.Layer | null = null;

    async function init() {
      // leaflet.heat (v0.2.0) is a bare IIFE that attaches `heatLayer` to the
      // GLOBAL `L`. In a webpack bundle Leaflet does not set a global `L`, and
      // the imported `L` can be a different object than the global one — so we
      // expose our imported `L` as the global first, then load the plugin.
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
        radius: 30,
        blur: 20,
        max,
        gradient: HEAT_GRADIENT,
      });
      layer.addTo(map);
    }

    init();

    return () => {
      cancelled = true;
      if (layer) map.removeLayer(layer);
    };
  }, [map, points, max]);

  return null;
}
