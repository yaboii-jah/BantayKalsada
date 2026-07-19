"use client";

import { TileLayer } from "react-leaflet";
import L from "leaflet";

const TAYTAY_BOUNDS = L.latLngBounds(
  [14.48, 121.1],
  [14.58, 121.17],
);

export function TrafficLayer() {
  return (
    <TileLayer
      url="/api/traffic/tiles/{z}/{x}/{y}"
      opacity={0.6}
      zIndex={500}
      bounds={TAYTAY_BOUNDS}
    />
  );
}
