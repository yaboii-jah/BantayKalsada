"use client";

import { useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Search, X } from "lucide-react";

const CATEGORIES = [
  { value: "POTHOLE", label: "Pothole" },
  { value: "FLOODED_ROAD", label: "Flooded Road" },
  { value: "ROAD_ACCIDENT", label: "Road Accident" },
  { value: "ROAD_RAGE", label: "Road Rage" },
  { value: "BROKEN_TRAFFIC_SIGN", label: "Broken Traffic Sign" },
  { value: "OTHER", label: "Other" },
];

const BARANGAYS = [
  { value: "DOLORES", label: "Dolores" },
  { value: "SAN_ISIDRO", label: "San Isidro" },
  { value: "SAN_JUAN", label: "San Juan" },
  { value: "SANTA_ANA", label: "Santa Ana" },
  { value: "MUZON", label: "Muzon" },
];

interface ReportFilterBarProps {
  search?: string;
  category?: string;
  barangay?: string;
  onNavigate?: (next: { q: string; category?: string; barangay?: string }) => void;
}

const selectClassName =
  "h-9 rounded-md border border-border bg-card px-3 text-sm text-foreground outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary";

export function ReportFilterBar({
  search = "",
  category = "",
  barangay = "",
  onNavigate,
}: ReportFilterBarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [q, setQ] = useState(search);

  const navigate = (next: { q: string; category?: string; barangay?: string }) => {
    if (onNavigate) {
      onNavigate(next);
      return;
    }
    const params = new URLSearchParams();
    if (next.q && next.q.trim()) params.set("q", next.q.trim());
    if (next.category) params.set("category", next.category);
    if (next.barangay) params.set("barangay", next.barangay);
    params.set("page", "1");
    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  };

  const hasFilters = Boolean(search || category || barangay);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        navigate({ q });
      }}
      className="mb-4 flex flex-wrap items-center gap-2"
    >
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search by title..."
          className="h-9 w-56 rounded-md border border-border bg-card pl-8 pr-3 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-primary focus:ring-1 focus:ring-primary"
        />
      </div>
      <select
        value={category}
        onChange={(e) => navigate({ q: search, category: e.target.value, barangay })}
        className={selectClassName}
        aria-label="Filter by category"
      >
        <option value="">All categories</option>
        {CATEGORIES.map((c) => (
          <option key={c.value} value={c.value}>
            {c.label}
          </option>
        ))}
      </select>
      <select
        value={barangay}
        onChange={(e) => navigate({ q: search, category, barangay: e.target.value })}
        className={selectClassName}
        aria-label="Filter by barangay"
      >
        <option value="">All barangays</option>
        {BARANGAYS.map((b) => (
          <option key={b.value} value={b.value}>
            {b.label}
          </option>
        ))}
      </select>
      {hasFilters && (
        <button
          type="button"
          onClick={() => {
            setQ("");
            navigate({ q: "" });
          }}
          className="inline-flex h-9 items-center gap-1 rounded-md px-3 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <X className="size-4" />
          Clear
        </button>
      )}
    </form>
  );
}
