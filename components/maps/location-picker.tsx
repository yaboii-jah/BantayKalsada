"use client";

import { useEffect, useState, useCallback } from "react";
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { LocateFixed } from "lucide-react";
import { NearbyReportsLayer } from "./nearby-reports-layer";
import { TaytayBoundary } from "./taytay-boundary";

const defaultIcon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

interface LocationPickerProps {
  value: { lat: number; lng: number; label?: string } | null;
  onChange: (location: { lat: number; lng: number; label?: string }) => void;
}

async function reverseGeocode(
  lat: number,
  lng: number,
): Promise<{ displayName?: string }> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1&accept-language=fil`,
      { headers: { "User-Agent": "BantayKalsada/1.0" } },
    );
    const data = await res.json();
    return { displayName: data.display_name as string | undefined };
  } catch {
    return {};
  }
}

function LocationMarker({
  position,
  onMove,
}: {
  position: [number, number] | null;
  onMove: (lat: number, lng: number) => void;
}) {
  useMapEvents({
    click(e) {
      onMove(e.latlng.lat, e.latlng.lng);
    },
  });

  const map = useMap();

  useEffect(() => {
    if (position) {
      map.flyTo(position, map.getZoom(), { duration: 0.5 });
    }
  }, [position, map]);

  return position ? (
    <Marker
      position={position}
      icon={defaultIcon}
      draggable={true}
      eventHandlers={{
        dragend(e) {
          const marker = e.target;
          const latlng = marker.getLatLng();
          onMove(latlng.lat, latlng.lng);
        },
      }}
    />
  ) : null;
}

export function LocationPicker({ value, onChange }: LocationPickerProps) {
  const [position, setPosition] = useState<[number, number] | null>(
    value ? [value.lat, value.lng] : null,
  );
  const [locating, setLocating] = useState(false);

  const handleMove = useCallback(
    async (lat: number, lng: number) => {
      setPosition([lat, lng]);
      const { displayName } = await reverseGeocode(lat, lng);
      onChange({ lat, lng, label: displayName });
    },
    [onChange],
  );

  const handleUseMyLocation = useCallback(() => {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setPosition([lat, lng]);
        const { displayName } = await reverseGeocode(lat, lng);
        onChange({ lat, lng, label: displayName });
        setLocating(false);
      },
      () => setLocating(false),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }, [onChange]);

  return (
    <div className="relative">
      <MapContainer
        center={position ?? [14.5587, 121.1360]}
        zoom={14}
        className="h-[400px] w-full rounded-lg"
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <TaytayBoundary />
        <LocationMarker position={position} onMove={handleMove} />
        <NearbyReportsLayer lat={position?.[0] ?? null} lng={position?.[1] ?? null} />
      </MapContainer>

      <button
        type="button"
        onClick={handleUseMyLocation}
        disabled={locating}
        className="absolute right-3 top-3 z-[1000] flex items-center gap-1.5 rounded-md bg-background px-2.5 py-1.5 text-xs font-medium text-foreground shadow-md ring-1 ring-border transition-colors hover:bg-muted disabled:opacity-50"
      >
        {locating ? (
          <>
            <span className="size-3 animate-spin rounded-full border-2 border-foreground border-t-transparent" />
            Locating…
          </>
        ) : (
          <>
            <LocateFixed className="size-3.5" />
            Use My Location
          </>
        )}
      </button>
      <div className="mt-1.5 flex items-center gap-1.5 text-xs text-muted-foreground">
        <span className="text-primary">📍</span>
        Reports accepted for <strong>Taytay, Rizal</strong> only
      </div>
    </div>
  );
}
