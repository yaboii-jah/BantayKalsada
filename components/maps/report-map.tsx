"use client";

import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";

export function ReportMap({
  latitude,
  longitude,
  locationLabel,
}: {
  latitude: number;
  longitude: number;
  locationLabel: string | null;
}) {
  return (
    <MapContainer
      center={[latitude, longitude]}
      zoom={15}
      className="aspect-[16/9] w-full rounded-lg"
      scrollWheelZoom={true}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <Marker position={[latitude, longitude]}>
        {locationLabel && <Popup>{locationLabel}</Popup>}
      </Marker>
    </MapContainer>
  );
}
