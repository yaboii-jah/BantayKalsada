"use client";

import dynamic from "next/dynamic";
import type { AnalyticsData } from "./analytics-charts";

const LazyAnalyticsCharts = dynamic(
  () => import("./analytics-charts").then((m) => m.AnalyticsCharts),
  {
    ssr: false,
    loading: () => (
      <div className="mt-10">
        <div className="mb-6 h-7 w-32 animate-pulse rounded bg-muted-foreground/10" />
        <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="h-24 animate-pulse rounded-lg border border-border bg-card"
            />
          ))}
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="h-72 animate-pulse rounded-lg border border-border bg-card"
            />
          ))}
        </div>
      </div>
    ),
  },
);

export function AnalyticsChartsLazy({ data }: { data: AnalyticsData }) {
  return <LazyAnalyticsCharts data={data} />;
}