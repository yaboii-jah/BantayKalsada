"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface BulkActionBarProps {
  selectedCount: number;
  onDeselectAll: () => void;
  onApprove: (ids: string[]) => Promise<{ success: boolean; error?: string; warnings?: string[] }>;
  onReject: (ids: string[], reason: string) => Promise<{ success: boolean; error?: string; warnings?: string[] }>;
  onResolve: (ids: string[]) => Promise<{ success: boolean; error?: string; warnings?: string[] }>;
  selectedIds: string[];
  actions: string[];
}

function showWarnings(warnings?: string[]) {
  warnings?.forEach((w) => toast.warning(w));
}

export function BulkActionBar({
  selectedCount,
  onDeselectAll,
  onApprove,
  onReject,
  onResolve,
  selectedIds,
  actions,
}: BulkActionBarProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  const handleApprove = () => {
    startTransition(async () => {
      const result = await onApprove(selectedIds);
      if (result.success) {
        toast.success(`Approved ${selectedIds.length} report${selectedIds.length > 1 ? "s" : ""}`);
        showWarnings(result.warnings);
        router.refresh();
        onDeselectAll();
      } else {
        toast.error(result.error ?? "Failed to approve reports");
      }
    });
  };

  const handleResolve = () => {
    startTransition(async () => {
      const result = await onResolve(selectedIds);
      if (result.success) {
        toast.success(`Resolved ${selectedIds.length} report${selectedIds.length > 1 ? "s" : ""}`);
        showWarnings(result.warnings);
        router.refresh();
        onDeselectAll();
      } else {
        toast.error(result.error ?? "Failed to resolve reports");
      }
    });
  };

  const handleRejectConfirm = () => {
    startTransition(async () => {
      const result = await onReject(selectedIds, rejectReason.trim());
      if (result.success) {
        toast.success(`Rejected ${selectedIds.length} report${selectedIds.length > 1 ? "s" : ""}`);
        showWarnings(result.warnings);
        router.refresh();
        setRejectOpen(false);
        setRejectReason("");
        onDeselectAll();
      } else {
        toast.error(result.error ?? "Failed to reject reports");
      }
    });
  };

  return (
    <>
      <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background px-4 py-3 shadow-lg sm:px-6">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <span className="text-sm text-muted-foreground">
            <strong className="text-foreground">{selectedCount}</strong> selected
          </span>
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={onDeselectAll}
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              Deselect all
            </button>
            {actions.includes("approve") && (
              <Button
                size="sm"
                onClick={handleApprove}
                disabled={isPending}
              >
                {isPending && <Loader2 className="mr-1.5 size-3.5 animate-spin" />}
                Approve ({selectedCount})
              </Button>
            )}
            {actions.includes("reject") && (
              <Button
                size="sm"
                variant="destructive"
                onClick={() => setRejectOpen(true)}
                disabled={isPending}
              >
                Reject ({selectedCount})
              </Button>
            )}
            {actions.includes("resolve") && (
              <Button
                size="sm"
                onClick={handleResolve}
                disabled={isPending}
              >
                {isPending && <Loader2 className="mr-1.5 size-3.5 animate-spin" />}
                Resolve ({selectedCount})
              </Button>
            )}
          </div>
        </div>
      </div>

      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Reject {selectedCount} report{selectedCount > 1 ? "s" : ""}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-1">
            <label className="text-sm font-medium text-foreground">
              Reason for rejection
            </label>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Explain why these reports are being rejected..."
              className="min-h-[100px] w-full rounded-md border border-border bg-background p-3 text-sm text-foreground outline-none ring-ring transition-colors focus:ring-2"
              maxLength={500}
            />
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{rejectReason.trim().length < 10 ? "Minimum 10 characters" : "Ready"}</span>
              <span>{rejectReason.length}/500</span>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setRejectOpen(false);
                setRejectReason("");
              }}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleRejectConfirm}
              disabled={rejectReason.trim().length < 10 || isPending}
            >
              {isPending && <Loader2 className="mr-1.5 size-3.5 animate-spin" />}
              Reject
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
