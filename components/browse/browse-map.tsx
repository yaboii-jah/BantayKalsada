"use client";

import { useEffect, useState, useRef } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import Link from "next/link";
import { Car, Flame, Layers, Check } from "lucide-react";
import { TaytayBoundary } from "@/components/maps/taytay-boundary";
import { HeatLayer } from "@/components/maps/heat-layer";
import { TrafficLayer } from "@/components/maps/traffic-layer";
import { type HeatPoint } from "@/lib/heatmap";

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

type BaseMapType = "street" | "terrain" | "satellite";

const BASE_MAP_OPTIONS: {
  value: BaseMapType;
  label: string;
  url: string;
  attribution: string;
  maxZoom: number;
}[] = [
  {
    value: "street",
    label: "Street",
    url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    maxZoom: 19,
  },
  {
    value: "terrain",
    label: "Terrain",
    url: "https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png",
    attribution:
      '&copy; <a href="https://opentopomap.org">OpenTopoMap</a> contributors',
    maxZoom: 17,
  },
  {
    value: "satellite",
    label: "Satellite",
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    attribution:
      '&copy; <a href="https://www.esri.com">ESRI</a>',
    maxZoom: 19,
  },
];

function BaseMapToggle({
  baseMap,
  onChange,
}: {
  baseMap: BaseMapType;
  onChange: (value: BaseMapType) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const option = BASE_MAP_OPTIONS.find((o) => o.value === baseMap) ?? BASE_MAP_OPTIONS[0];

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground shadow transition-colors hover:text-foreground"
      >
        <Layers className="size-3.5" />
        {option.label}
      </button>
      {open && (
        <div className="absolute right-0 top-full z-[1100] mt-1 w-28 overflow-hidden rounded-lg border border-border bg-popover p-1 text-popover-foreground shadow-md ring-1 ring-foreground/10">
          {BASE_MAP_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => {
                onChange(opt.value);
                setOpen(false);
              }}
              className={`flex w-full items-center justify-between gap-2 rounded-md px-2 py-1.5 text-xs font-medium ${
                baseMap === opt.value
                  ? "bg-primary text-primary-foreground"
                  : "text-foreground hover:bg-accent"
              }`}
            >
              {opt.label}
              {baseMap === opt.value && <Check className="size-3" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

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
      className={`flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium shadow transition-colors ${
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

const TRAFFIC_LEVELS = [
  { color: "#16a34a", label: "Light" },
  { color: "#eab308", label: "Moderate" },
  { color: "#f97316", label: "Heavy" },
  { color: "#dc2626", label: "Severe" },
];

function TrafficLegend() {
  return (
    <div className="absolute bottom-4 left-4 z-[1000] flex items-center gap-3 rounded-lg bg-background/90 px-3 py-1.5 text-xs text-muted-foreground shadow backdrop-blur-sm">
      {TRAFFIC_LEVELS.map((level) => (
        <span key={level.label} className="flex items-center gap-1">
          <span
            className="size-2 rounded-full"
            style={{ backgroundColor: level.color }}
          />
          {level.label}
        </span>
      ))}
    </div>
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
  baseMap,
  onBaseMapChange,
}: {
  reports: BrowseMapReport[];
  heatPoints: HeatPoint[];
  baseMap: BaseMapType;
  onBaseMapChange: (value: BaseMapType) => void;
}) {
  const map = useMap();
  const [showHeat, setShowHeat] = useState(true);
  const [showTraffic, setShowTraffic] = useState(false);
  const fittedRef = useRef(false);

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
      <div className="absolute right-4 top-4 z-[1000] flex flex-row gap-1.5">
        <BaseMapToggle baseMap={baseMap} onChange={onBaseMapChange} />
        <HeatToggle showHeat={showHeat} onToggle={() => setShowHeat((v) => !v)} />
        <TrafficToggle showTraffic={showTraffic} onToggle={() => setShowTraffic((v) => !v)} />
      </div>

      {reports.map((report) => (
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

      {showHeat && <HeatLayer points={heatPoints} max={3} />}
      {showTraffic && <TrafficLayer />}
      {showTraffic && <TrafficLegend />}

      <div className="absolute bottom-4 left-1/2 z-[1000] -translate-x-1/2">
        <div className="flex items-center gap-3 rounded-lg bg-background/90 px-4 py-2 text-sm text-muted-foreground shadow backdrop-blur-sm">
          <span>
            {reports.length > 0
              ? `${reports.length} ${reports.length === 1 ? "report" : "reports"}`
              : "No reports to show"}
          </span>
          {reports.length > 0 && (
            <button
              type="button"
              onClick={handleReset}
              className="font-medium text-primary hover:text-primary/80"
            >
              Reset
            </button>
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
  const [baseMap, setBaseMap] = useState<BaseMapType>("street");
  const option = BASE_MAP_OPTIONS.find((o) => o.value === baseMap) ?? BASE_MAP_OPTIONS[0];

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
      maxZoom={19}
      className="aspect-[4/3] w-full rounded-lg lg:aspect-[3/2]"
      scrollWheelZoom={true}
    >
      <TileLayer key={baseMap} url={option.url} attribution={option.attribution} maxZoom={option.maxZoom} />
      <TaytayBoundary />
      <MapContent
        reports={reports}
        heatPoints={heatPoints}
        baseMap={baseMap}
        onBaseMapChange={setBaseMap}
      />
    </MapContainer>
  );
}
