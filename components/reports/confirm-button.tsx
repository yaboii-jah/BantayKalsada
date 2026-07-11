"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { ThumbsUp, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { toggleConfirmation } from "@/app/actions";

export function ConfirmButton({
  reportId,
  initialConfirmed,
  initialCount,
}: {
  reportId: string;
  initialConfirmed: boolean;
  initialCount: number;
}) {
  const [confirmed, setConfirmed] = useState(initialConfirmed);
  const [count, setCount] = useState(initialCount);
  const [pending, startTransition] = useTransition();

  const handleClick = () => {
    startTransition(async () => {
      const result = await toggleConfirmation(reportId);
      if (result.success) {
        setConfirmed(result.confirmed ?? !confirmed);
        setCount(result.count ?? count);
      } else {
        toast.error(result.error ?? "Something went wrong");
      }
    });
  };

  return (
    <button
      type="button"
      disabled={pending}
      onClick={handleClick}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors",
        confirmed
          ? "border-primary bg-primary/10 text-primary"
          : "border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground",
        pending && "pointer-events-none opacity-60",
      )}
    >
      {pending ? (
        <Loader2 className="size-3.5 animate-spin" />
      ) : (
        <ThumbsUp className={cn("size-3.5", confirmed && "fill-current")} />
      )}
      {count > 0 && <span>{count}</span>}
      {confirmed ? "Confirmed" : "Confirm"}
    </button>
  );
}
