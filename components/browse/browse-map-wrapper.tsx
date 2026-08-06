"use client";

import dynamic from "next/dynamic";

const BrowseMapInner = dynamic(
  () => import("@/components/browse/browse-map").then((m) => m.BrowseMap),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[60vh] min-h-80 w-full items-center justify-center rounded-lg bg-muted lg:h-[70vh]">
        <p className="text-sm text-muted-foreground">Loading map…</p>
      </div>
    ),
  },
);

import type { HeatPoint } from "@/lib/heatmap";

interface BrowseMapReport {
  id: string;
  title: string;
  category: string;
  status: string;
  latitude: number;
  longitude: number;
  photo_urls: string[];
}

export function BrowseMapWrapper({
  reports,
  heatPoints,
}: {
  reports: BrowseMapReport[];
  heatPoints: HeatPoint[];
}) {
  return <BrowseMapInner reports={reports} heatPoints={heatPoints} />;
}
