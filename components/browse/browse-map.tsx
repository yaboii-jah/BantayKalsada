"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import MarkerClusterGroup from "react-leaflet-cluster";
import Link from "next/link";

L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

interface BrowseMapReport {
  id: string;
  title: string;
  category: string;
  status: string;
  latitude: number;
  longitude: number;
  photo_urls: string[];
}

const categoryLabels: Record<string, string> = {
  POTHOLE: "Pothole",
  FLOODED_ROAD: "Flooded Road",
  ROAD_ACCIDENT: "Road Accident",
  ROAD_RAGE: "Road Rage",
  OTHER: "Other",
};

const statusColors: Record<string, string> = {
  APPROVED: "bg-status-approved/10 text-status-approved",
  RESOLVED: "bg-status-resolved/10 text-status-resolved",
};

function MapContent({ reports }: { reports: BrowseMapReport[] }) {
  const map = useMap();
  const [bounds, setBounds] = useState<L.LatLngBounds | null>(null);
  const initialFitDone = useRef(false);

  useMapEvents({
    moveend() {
      setBounds(map.getBounds());
    },
    zoomend() {
      setBounds(map.getBounds());
    },
  });

  useEffect(() => {
    if (initialFitDone.current || reports.length === 0) return;
    initialFitDone.current = true;

    if (reports.length === 1) {
      map.setView([reports[0].latitude, reports[0].longitude], 15);
    } else {
      const allBounds = L.latLngBounds(
        reports.map((r) => [r.latitude, r.longitude]),
      );
      map.fitBounds(allBounds, { padding: [48, 48] });
    }
  }, [map, reports]);

  const visibleReports = useMemo(() => {
    if (!bounds || reports.length === 0) return reports;
    return reports.filter((r) => bounds.contains([r.latitude, r.longitude]));
  }, [bounds, reports]);

  const isFiltered = visibleReports.length < reports.length;

  function handleReset() {
    const allBounds = L.latLngBounds(
      reports.map((r) => [r.latitude, r.longitude]),
    );
    map.fitBounds(allBounds, { padding: [48, 48] });
  }

  return (
    <>
      <MarkerClusterGroup chunkedLoading>
        {visibleReports.map((report) => (
          <Marker
            key={report.id}
            position={[report.latitude, report.longitude]}
          >
            <Popup>
              <div className="flex flex-col gap-2 text-sm">
                {report.photo_urls[0] && (
                  <img
                    src={report.photo_urls[0]}
                    alt={report.title}
                    className="aspect-[4/3] w-48 rounded object-cover"
                  />
                )}
                <p className="max-w-48 truncate font-semibold text-foreground">
                  {report.title}
                </p>
                <div className="flex flex-wrap gap-1">
                  <span className="inline-flex items-center rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                    {categoryLabels[report.category] ?? report.category}
                  </span>
                  <span
                    className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium ${
                      statusColors[report.status] ?? "bg-muted text-muted-foreground"
                    }`}
                  >
                    {report.status}
                  </span>
                </div>
                <Link
                  href={`/reports/${report.id}`}
                  className="text-xs font-medium text-primary hover:text-primary/80"
                >
                  View details →
                </Link>
              </div>
            </Popup>
          </Marker>
        ))}
      </MarkerClusterGroup>
      <div className="absolute bottom-4 left-1/2 z-[1000] -translate-x-1/2">
        <div className="flex items-center gap-3 rounded-lg bg-background/90 px-4 py-2 text-sm text-muted-foreground shadow backdrop-blur-sm">
          {visibleReports.length > 0 ? (
            <>
              <span>
                Showing {visibleReports.length} of {reports.length}{" "}
                {reports.length === 1 ? "report" : "reports"} in this area
              </span>
              {isFiltered && (
                <button
                  type="button"
                  onClick={handleReset}
                  className="font-medium text-primary hover:text-primary/80"
                >
                  Reset
                </button>
              )}
            </>
          ) : (
            <>
              <span>No reports in this area</span>
              <button
                type="button"
                onClick={handleReset}
                className="font-medium text-primary hover:text-primary/80"
              >
                Reset
              </button>
            </>
          )}
        </div>
      </div>
    </>
  );
}

export function BrowseMap({ reports }: { reports: BrowseMapReport[] }) {
  if (reports.length === 0) {
    return (
      <div className="flex aspect-[4/3] items-center justify-center rounded-lg bg-muted lg:aspect-[3/2]">
        <p className="text-sm text-muted-foreground">No reports to show on map</p>
      </div>
    );
  }

  const center: [number, number] =
    reports.length === 1
      ? [reports[0].latitude, reports[0].longitude]
      : [14.5, 121];

  return (
    <MapContainer
      center={center}
      zoom={10}
      className="aspect-[4/3] w-full rounded-lg lg:aspect-[3/2]"
      scrollWheelZoom={true}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <MapContent reports={reports} />
    </MapContainer>
  );
}
