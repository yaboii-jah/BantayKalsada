"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { SlidersHorizontal, Search, X, LayoutGrid, Map } from "lucide-react";
import { InlineSelect } from "@/components/ui/inline-select";

const categories = [
  { value: "all", label: "All categories" },
  { value: "POTHOLE", label: "Pothole" },
  { value: "FLOODED_ROAD", label: "Flooded Road" },
  { value: "ROAD_ACCIDENT", label: "Road Accident" },
  { value: "ROAD_RAGE", label: "Road Rage" },
  { value: "OTHER", label: "Other" },
];

const statuses = [
  { value: "all", label: "All statuses" },
  { value: "APPROVED", label: "Approved" },
  { value: "RESOLVED", label: "Resolved" },
];

const barangays = [
  { value: "all", label: "All barangays" },
  { value: "DOLORES", label: "Dolores" },
  { value: "SAN_ISIDRO", label: "San Isidro" },
  { value: "SAN_JUAN", label: "San Juan" },
  { value: "SANTA_ANA", label: "Santa Ana" },
  { value: "MUZON", label: "Muzon" },
];

export function FilterBar({ view }: { view: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showRightFade, setShowRightFade] = useState(false);

  useEffect(() => {
    function check() {
      const el = scrollRef.current;
      if (!el) return;
      setShowRightFade(el.scrollWidth - el.scrollLeft - el.clientWidth > 8);
    }
    const el = scrollRef.current;
    if (!el) return;
    const ro = new ResizeObserver(check);
    ro.observe(el);
    el.addEventListener("scroll", check, { passive: true });
    check();
    return () => {
      ro.disconnect();
      el.removeEventListener("scroll", check);
    };
  }, []);

  const currentCategory = searchParams.get("category") ?? "all";
  const currentStatus = searchParams.get("status") ?? "all";
  const currentBarangay = searchParams.get("barangay") ?? "all";
  const currentQ = searchParams.get("q") ?? "";

  function buildHref(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value && value !== "all") {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    params.delete("page");
    return `?${params.toString()}`;
  }

  return (
    <div className="relative -mx-4 px-4 sm:mx-0 sm:px-0">
      <div ref={scrollRef} className="flex items-center gap-2 overflow-x-auto sm:flex-wrap">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            defaultValue={currentQ}
            placeholder="Search by keyword..."
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                const value = (e.target as HTMLInputElement).value.trim();
                router.push(buildHref("q", value));
              }
            }}
            className={`h-8 w-48 rounded-lg border border-input bg-transparent pl-8 text-sm outline-none transition-colors placeholder:text-muted-foreground/50 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 ${currentQ ? "pr-8" : "pr-2.5"}`}
          />
          {currentQ && (
            <button
              type="button"
              onClick={() => router.push(buildHref("q", ""))}
              className="absolute right-1.5 top-1/2 flex size-5 -translate-y-1/2 items-center justify-center rounded text-muted-foreground/40 transition-colors hover:text-foreground"
              aria-label="Clear search"
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>
        <SlidersHorizontal className="size-4 text-muted-foreground" />
        <InlineSelect
          value={currentCategory}
          options={categories}
          onSelect={(value) => router.push(buildHref("category", value))}
          className="h-8 px-2.5 py-2 w-44"
        />
        <InlineSelect
          value={currentStatus}
          options={statuses}
          onSelect={(value) => router.push(buildHref("status", value))}
          className="h-8 px-2.5 py-2 w-40"
        />
        <InlineSelect
          value={currentBarangay}
          options={barangays}
          onSelect={(value) => router.push(buildHref("barangay", value))}
          className="h-8 px-2.5 py-2 w-44"
        />
        <div className="flex overflow-hidden rounded-lg border border-input">
          <button
            type="button"
            onClick={() => router.push(buildHref("view", "grid"))}
            className={`flex size-8 items-center justify-center transition-colors ${
              view === "grid"
                ? "bg-accent text-foreground"
                : "bg-transparent text-muted-foreground hover:bg-accent/50"
            }`}
            aria-label="Grid view"
          >
            <LayoutGrid className="size-4" />
          </button>
          <button
            type="button"
            onClick={() => router.push(buildHref("view", "map"))}
            className={`flex size-8 items-center justify-center transition-colors ${
              view === "map"
                ? "bg-accent text-foreground"
                : "bg-transparent text-muted-foreground hover:bg-accent/50"
            }`}
            aria-label="Map view"
          >
            <Map className="size-4" />
          </button>
        </div>
      </div>
      {showRightFade && (
        <div className="pointer-events-none absolute right-0 top-0 h-full w-16 bg-gradient-to-l from-background via-background/80 to-transparent sm:hidden" />
      )}
    </div>
  );
}
