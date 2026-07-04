"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import {
  CheckCircle,
  XCircle,
  CheckCheck,
  Loader2,
} from "lucide-react";
import type { Database } from "@/types/database.types";

type ReportStatus = Database["public"]["Enums"]["report_status"];

interface ActionButtonsProps {
  reportId: string;
  status: ReportStatus;
  onApprove: (reportId: string) => Promise<{ success: boolean; error?: string }>;
  onReject: (reportId: string, reason: string) => Promise<{ success: boolean; error?: string }>;
  onResolve: (reportId: string) => Promise<{ success: boolean; error?: string }>;
}

export function ActionButtons({
  reportId,
  status,
  onApprove,
  onReject,
  onResolve,
}: ActionButtonsProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleApprove = () => {
    startTransition(async () => {
      const result = await onApprove(reportId);
      if (result.success) {
        toast.success("Report approved");
        router.push("/admin/pending");
        router.refresh();
      } else {
        toast.error(result.error ?? "Failed to approve report");
      }
    });
  };

  const handleResolve = () => {
    startTransition(async () => {
      const result = await onResolve(reportId);
      if (result.success) {
        toast.success("Report marked as resolved");
        router.push("/admin/approved");
        router.refresh();
      } else {
        toast.error(result.error ?? "Failed to resolve report");
      }
    });
  };

  if (status === "APPROVED") {
    return (
      <Button
        onClick={handleResolve}
        disabled={isPending}
        size="lg"
      >
        {isPending ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <CheckCheck className="mr-2 h-4 w-4" />
        )}
        Mark as Resolved
      </Button>
    );
  }

  if (status !== "PENDING") {
    return null;
  }

  return (
    <div className="flex gap-3">
      <Button
        onClick={handleApprove}
        disabled={isPending}
        size="lg"
      >
        {isPending ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <CheckCircle className="mr-2 h-4 w-4" />
        )}
        Approve
      </Button>
      <RejectButton
        reportId={reportId}
        onReject={onReject}
        disabled={isPending}
      />
    </div>
  );
}

function RejectButton({
  reportId,
  onReject,
  disabled,
}: {
  reportId: string;
  onReject: (reportId: string, reason: string) => Promise<{ success: boolean; error?: string }>;
  disabled: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleConfirm = async () => {
    if (reason.trim().length < 10) return;
    setIsSubmitting(true);
    const result = await onReject(reportId, reason.trim());
    setIsSubmitting(false);
    if (result.success) {
      toast.success("Report rejected");
      setOpen(false);
      router.push("/admin/pending");
      router.refresh();
    } else {
      toast.error(result.error ?? "Failed to reject report");
    }
  };

  return (
    <>
      <Button
        variant="destructive"
        size="lg"
        onClick={() => setOpen(true)}
        disabled={disabled}
      >
        <XCircle className="mr-2 h-4 w-4" />
        Reject
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Reject Report</DialogTitle>
            <DialogDescription>
              You are about to reject this report. The submitter will receive
              this reason via email.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <label
              htmlFor="rejection-reason"
              className="text-sm font-medium text-foreground"
            >
              Reason for rejection
            </label>
            <textarea
              id="rejection-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Explain why this report was rejected..."
              className="flex min-h-[100px] w-full rounded-md border border-border bg-input px-3 py-2 text-sm outline-none placeholder:text-muted-foreground focus:border-primary focus:ring-1 focus:ring-primary"
              maxLength={500}
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>
                {reason.trim().length < 10
                  ? `${10 - reason.trim().length} more characters required`
                  : "Minimum met"}
              </span>
              <span>{reason.length}/500</span>
            </div>
          </div>

          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button
              variant="destructive"
              onClick={handleConfirm}
              disabled={reason.trim().length < 10 || isSubmitting}
            >
              {isSubmitting && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Confirm Rejection
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
