"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import MarkerClusterGroup from "react-leaflet-cluster";
import Link from "next/link";
import { Car, Flame } from "lucide-react";
import { TaytayBoundary } from "@/components/maps/taytay-boundary";
import { HeatLayer } from "@/components/maps/heat-layer";
import { TrafficLayer } from "@/components/maps/traffic-layer";
import { severityWeight, type HeatPoint } from "@/lib/heatmap";

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

function HeatToggle({
  showHeat,
  onToggle,
}: {
  showHeat: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={showHeat}
      className={`absolute right-4 top-4 z-[1000] flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium shadow transition-colors ${
        showHeat
          ? "bg-primary text-primary-foreground"
          : "bg-card text-muted-foreground hover:text-foreground"
      }`}
    >
      <Flame className="size-3.5" />
      Heat
    </button>
  );
}

function TrafficToggle({
  showTraffic,
  onToggle,
}: {
  showTraffic: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={showTraffic}
      className={`flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium shadow transition-colors ${
        showTraffic
          ? "bg-primary text-primary-foreground"
          : "bg-card text-muted-foreground hover:text-foreground"
      }`}
    >
      <Car className="size-3.5" />
      Traffic
    </button>
  );
}

function MapContent({
  reports,
  heatPoints,
}: {
  reports: BrowseMapReport[];
  heatPoints: HeatPoint[];
}) {
  const map = useMap();
  const [bounds, setBounds] = useState<L.LatLngBounds | null>(null);
  const [showHeat, setShowHeat] = useState(true);
  const [showTraffic, setShowTraffic] = useState(false);
  const [trafficPoints, setTrafficPoints] = useState<HeatPoint[]>([]);
  const fittedRef = useRef(false);

  useMapEvents({
    moveend() {
      setBounds(map.getBounds());
    },
    zoomend() {
      setBounds(map.getBounds());
    },
  });

  useEffect(() => {
    if (fittedRef.current) return;
    fittedRef.current = true;

    const target =
      reports.length > 0
        ? reports.map((r) => [r.latitude, r.longitude] as [number, number])
        : heatPoints.map((p) => [p[0], p[1]] as [number, number]);

    if (target.length === 0) return;

    if (target.length === 1) {
      map.setView(target[0], 15);
    } else {
      map.fitBounds(L.latLngBounds(target), { padding: [48, 48] });
    }
  }, [map, reports, heatPoints]);

  useEffect(() => {
    if (!showTraffic) return;
    let active = true;
    fetch("/api/traffic")
      .then((r) => r.json())
      .then((data) => {
        if (active) setTrafficPoints(data.points ?? []);
      })
      .catch(() => {
        if (active) setTrafficPoints([]);
      });
    return () => {
      active = false;
    };
  }, [showTraffic]);

  const visibleReports = useMemo(() => {
    if (!bounds || reports.length === 0) return reports;
    return reports.filter((r) => bounds.contains([r.latitude, r.longitude]));
  }, [bounds, reports]);

  const isFiltered = visibleReports.length < reports.length;

  function handleReset() {
    const points = reports.length > 0 ? reports : heatPoints;
    if (points.length === 0) return;
    const allBounds = L.latLngBounds(
      points.map((p) =>
        "latitude" in p
          ? ([p.latitude, p.longitude] as [number, number])
          : ([p[0], p[1]] as [number, number]),
      ),
    );
    map.fitBounds(allBounds, { padding: [48, 48] });
  }

  return (
    <>
      <div className="absolute right-4 top-4 z-[1000] flex flex-col gap-1.5">
        <HeatToggle showHeat={showHeat} onToggle={() => setShowHeat((v) => !v)} />
        <TrafficToggle showTraffic={showTraffic} onToggle={() => setShowTraffic((v) => !v)} />
      </div>

      <MarkerClusterGroup chunkedLoading>
        {visibleReports.map((report) => (
          <Marker
            key={report.id}
            position={[report.latitude, report.longitude]}
          >
            <Popup>
              <div className="browse-popup flex flex-col gap-2 text-sm">
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

      {showHeat && <HeatLayer points={heatPoints} max={3} />}
      {showTraffic && trafficPoints.length > 0 && <TrafficLayer points={trafficPoints} />}

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

export function BrowseMap({
  reports,
  heatPoints,
}: {
  reports: BrowseMapReport[];
  heatPoints: HeatPoint[];
}) {
  if (reports.length === 0 && heatPoints.length === 0) {
    return (
      <div className="flex aspect-[4/3] items-center justify-center rounded-lg bg-muted lg:aspect-[3/2]">
        <p className="text-sm text-muted-foreground">No reports to show on map</p>
      </div>
    );
  }

  const center: [number, number] =
    reports.length === 1
      ? [reports[0].latitude, reports[0].longitude]
      : [14.5587, 121.136];

  return (
    <MapContainer
      center={center}
      zoom={12}
      className="aspect-[4/3] w-full rounded-lg lg:aspect-[3/2]"
      scrollWheelZoom={true}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <TaytayBoundary />
      <MapContent reports={reports} heatPoints={heatPoints} />
    </MapContainer>
  );
}
