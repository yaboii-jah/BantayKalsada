"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";

const statusTabs = [
  { value: "all", label: "All" },
  { value: "PENDING", label: "Pending" },
  { value: "APPROVED", label: "Approved" },
  { value: "REJECTED", label: "Rejected" },
  { value: "RESOLVED", label: "Resolved" },
];

export function MyReportsFilter() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentStatus = searchParams.get("status") ?? "all";

  function handleSelect(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value && value !== "all") {
      params.set("status", value);
    } else {
      params.delete("status");
    }
    params.delete("page");
    router.push(`/my-reports?${params.toString()}`);
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="flex flex-wrap items-center gap-1">
        {statusTabs.map((tab) => (
          <button
            key={tab.value}
            type="button"
            onClick={() => handleSelect(tab.value)}
            aria-pressed={currentStatus === tab.value}
            className={cn(
              "rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
              currentStatus === tab.value
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>
    </div>
  );
}
