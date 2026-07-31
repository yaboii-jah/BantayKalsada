"use client";

import { useEffect, useState } from "react";
import { useTransition } from "react";
import { Loader2, Flag, CheckCircle2, MapPinOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { flagReport } from "@/app/actions";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type FlagType = "ALREADY_FIXED" | "WRONG_LOCATION";

interface FlagReportButtonsProps {
  reportId: string;
}

const flagOptions: { type: FlagType; label: string; icon: typeof Flag }[] = [
  { type: "ALREADY_FIXED", label: "Already fixed", icon: CheckCircle2 },
  { type: "WRONG_LOCATION", label: "Wrong location", icon: MapPinOff },
];

export function FlagReportButtons({ reportId }: FlagReportButtonsProps) {
  const [activeFlags, setActiveFlags] = useState<FlagType[]>([]);
  const [loading, setLoading] = useState(true);
  const [pendingType, setPendingType] = useState<FlagType | null>(null);
  const [, startTransition] = useTransition();
  useEffect(() => {
    let cancelled = false;
    const fetchMyFlags = async () => {
      try {
        const supabase = createSupabaseBrowserClient();
        const { data } = await supabase
          .from("report_flags")
          .select("flag_type")
          .eq("report_id", reportId);
        if (!cancelled) {
          setActiveFlags((data?.map((f) => f.flag_type as FlagType) ?? []));
        }
      } catch {
        // ignore — user can still attempt to flag
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };
    fetchMyFlags();
    return () => {
      cancelled = true;
    };
  }, [reportId]);

  const handleToggle = (type: FlagType) => {
    setPendingType(type);
    startTransition(async () => {
      const result = await flagReport(reportId, type);
      setPendingType(null);
      if (result.success) {
        setActiveFlags((prev) =>
          result.active ? [...prev, type] : prev.filter((t) => t !== type),
        );
        if (result.active) {
          toast.success(type === "ALREADY_FIXED" ? "Marked as already fixed" : "Flagged as wrong location");
        } else {
          toast.success(type === "ALREADY_FIXED" ? "Removed already-fixed flag" : "Removed wrong-location flag");
        }
      } else {
        toast.error(result.error ?? "Failed to update flag");
      }
    });
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="mr-1 flex items-center text-sm text-muted-foreground">
        <Flag className="mr-1.5 size-4" />
        Is this report outdated?
      </span>
      {flagOptions.map(({ type, label, icon: Icon }) => {
        const isActive = activeFlags.includes(type);
        const isPending = pendingType === type;
        return (
          <Button
            key={type}
            type="button"
            variant={isActive ? "default" : "outline"}
            size="sm"
            disabled={isPending || loading}
            onClick={() => handleToggle(type)}
            className={cn(isActive && "border-transparent")}
          >
            {isPending ? (
              <Loader2 className="mr-1.5 size-4 animate-spin" />
            ) : (
              <Icon className="mr-1.5 size-4" />
            )}
            {label}
          </Button>
        );
      })}
    </div>
  );
}
