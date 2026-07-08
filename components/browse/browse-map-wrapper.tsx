"use client";

import dynamic from "next/dynamic";

const BrowseMapInner = dynamic(
  () => import("@/components/browse/browse-map").then((m) => m.BrowseMap),
  {
    ssr: false,
    loading: () => (
      <div className="flex aspect-[4/3] items-center justify-center rounded-lg bg-muted lg:aspect-[3/2]">
        <p className="text-sm text-muted-foreground">Loading map…</p>
      </div>
    ),
  },
);

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
}: {
  reports: BrowseMapReport[];
}) {
  return <BrowseMapInner reports={reports} />;
}
