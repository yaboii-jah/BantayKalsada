"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { SlidersHorizontal, ChevronDown } from "lucide-react";

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

function InlineSelect({
  value,
  options,
  onSelect,
  className,
}: {
  value: string;
  options: { value: string; label: string }[];
  onSelect: (value: string) => void;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const selected = options.find((o) => o.value === value);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleEscape);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((p) => !p)}
        className={`flex h-8 w-full items-center justify-between gap-1.5 rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm whitespace-nowrap transition-colors outline-none select-none hover:bg-accent/50 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 ${className ?? ""}`}
      >
        <span className="truncate">{selected?.label ?? "Select"}</span>
        <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
      </button>
      {open && (
        <div className="absolute left-0 top-full z-50 mt-1 min-w-36 origin-top overflow-hidden rounded-lg bg-popover text-popover-foreground shadow-md ring-1 ring-foreground/10">
          {options.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => {
                onSelect(opt.value);
                setOpen(false);
              }}
              className={`flex w-full items-center px-2.5 py-1.5 text-sm outline-none select-none hover:bg-accent hover:text-accent-foreground ${
                opt.value === value ? "bg-accent/50 font-medium" : ""
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function FilterBar({ totalCount }: { totalCount: number }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const currentCategory = searchParams.get("category") ?? "all";
  const currentStatus = searchParams.get("status") ?? "all";

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
    <div className="flex flex-wrap items-center gap-3">
      <div className="flex items-center gap-2">
        <SlidersHorizontal className="size-4 text-muted-foreground" />
        <InlineSelect
          value={currentCategory}
          options={categories}
          onSelect={(value) => router.push(buildHref("category", value))}
          className="w-44"
        />
        <InlineSelect
          value={currentStatus}
          options={statuses}
          onSelect={(value) => router.push(buildHref("status", value))}
          className="w-40"
        />
      </div>
      <p className="text-sm text-muted-foreground">
        {totalCount} {totalCount === 1 ? "report" : "reports"}
      </p>
    </div>
  );
}
