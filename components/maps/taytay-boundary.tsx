"use client";

import { Polygon } from "react-leaflet";
import { TAYTAY_POLYGON } from "@/lib/taytay-boundary";

export function TaytayBoundary() {
  return (
    <Polygon
      positions={TAYTAY_POLYGON}
      pathOptions={{
        color: "#0d9488",
        weight: 2,
        fillColor: "#0d9488",
        fillOpacity: 0.08,
        dashArray: "6 4",
      }}
    />
  );
}