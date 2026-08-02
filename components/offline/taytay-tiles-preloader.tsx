"use client";

import { useEffect } from "react";

const CENTER: [number, number] = [14.5587, 121.136];
const ZOOMS = [15, 16];
const RADIUS_TILES = 2;

function latLngToTile(lat: number, lng: number, z: number): [number, number] {
  const n = Math.pow(2, z);
  const x = Math.floor(((lng + 180) / 360) * n);
  const latRad = (lat * Math.PI) / 180;
  const y = Math.floor(
    ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n,
  );
  return [x, y];
}

async function warmTiles() {
  if (!navigator.onLine) return;
  try {
    const cache = await caches.open("static-image-assets");
    for (const z of ZOOMS) {
      const [cx, cy] = latLngToTile(CENTER[0], CENTER[1], z);
      for (let dx = -RADIUS_TILES; dx <= RADIUS_TILES; dx++) {
        for (let dy = -RADIUS_TILES; dy <= RADIUS_TILES; dy++) {
          const x = cx + dx;
          const y = cy + dy;
          const url = `https://tile.openstreetmap.org/${z}/${x}/${y}.png`;
          const key = new Request(url);
          const cached = await cache.match(key);
          if (cached) continue;
          try {
            const res = await fetch(url);
            if (res.ok) {
              await cache.put(key, res.clone());
            }
          } catch {
            /* ignore tile warm-up failures */
          }
        }
      }
    }
  } catch {
    /* caching unavailable — boundary polygon + point-in-polygon still apply */
  }
}

export function TaytayTilesPreloader() {
  useEffect(() => {
    void warmTiles();
  }, []);
  return null;
}