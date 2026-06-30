"use client";

import dynamic from "next/dynamic";

const ReportMapInner = dynamic(
  () => import("@/components/maps/report-map").then((m) => m.ReportMap),
  {
    ssr: false,
    loading: () => (
      <div className="flex aspect-[16/9] items-center justify-center rounded-lg bg-muted">
        <p className="text-sm text-muted-foreground">Loading map…</p>
      </div>
    ),
  },
);

export function ReportMapWrapper({
  latitude,
  longitude,
  locationLabel,
}: {
  latitude: number;
  longitude: number;
  locationLabel: string | null;
}) {
  return (
    <ReportMapInner
      latitude={latitude}
      longitude={longitude}
      locationLabel={locationLabel}
    />
  );
}
