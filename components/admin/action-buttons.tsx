"use client";

import { useState } from "react";
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
import { PhotoUpload } from "@/components/reports/photo-upload";

type ReportStatus = Database["public"]["Enums"]["report_status"];

interface ActionButtonsProps {
  reportId: string;
  status: ReportStatus;
  onApprove: (reportId: string) => Promise<{ success: boolean; error?: string; warnings?: string[] }>;
  onReject: (reportId: string, reason: string) => Promise<{ success: boolean; error?: string; warnings?: string[] }>;
  onResolve: (reportId: string, resolutionNotes?: string, resolvedImageUrls?: string[]) => Promise<{ success: boolean; error?: string; warnings?: string[] }>;
}

function showWarnings(warnings?: string[]) {
  warnings?.forEach((w) => toast.warning(w));
}

export function ActionButtons({
  reportId,
  status,
  onApprove,
  onReject,
  onResolve,
}: ActionButtonsProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleApprove = async () => {
    setIsSubmitting(true);
    try {
      const result = await onApprove(reportId);
      if (result.success) {
        toast.success("Report approved");
        showWarnings(result.warnings);
        router.refresh();
      } else {
        toast.error(result.error ?? "Failed to approve report");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (status === "APPROVED") {
    return (
      <ResolveButton
        reportId={reportId}
        onResolve={onResolve}
        disabled={isSubmitting}
      />
    );
  }

  if (status !== "PENDING") {
    return null;
  }

  return (
    <div className="flex gap-3">
      <Button
        onClick={handleApprove}
        disabled={isSubmitting}
        size="lg"
      >
        {isSubmitting ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <CheckCircle className="mr-2 h-4 w-4" />
        )}
        Approve
      </Button>
      <RejectButton
        reportId={reportId}
        onReject={onReject}
        disabled={isSubmitting}
      />
    </div>
  );
}

function ResolveButton({
  reportId,
  onResolve,
  disabled,
}: {
  reportId: string;
  onResolve: (reportId: string, resolutionNotes?: string, resolvedImageUrls?: string[]) => Promise<{ success: boolean; error?: string; warnings?: string[] }>;
  disabled: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [notes, setNotes] = useState("");
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleConfirm = async () => {
    setIsSubmitting(true);
    const result = await onResolve(
      reportId,
      notes.trim() || undefined,
      imageUrls.length > 0 ? imageUrls : undefined,
    );
    setIsSubmitting(false);
    if (result.success) {
      toast.success("Report marked as resolved");
      showWarnings(result.warnings);
      setOpen(false);
      router.refresh();
    } else {
      toast.error(result.error ?? "Failed to resolve report");
    }
  };

  return (
    <>
      <Button
        size="lg"
        onClick={() => setOpen(true)}
        disabled={disabled}
      >
        <CheckCheck className="mr-2 h-4 w-4" />
        Mark as Resolved
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Resolve Report</DialogTitle>
            <DialogDescription>
              Mark this report as resolved. You can optionally add notes
              describing how the issue was addressed and upload after-photos.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <label
                htmlFor="resolution-notes"
                className="text-sm font-medium text-foreground"
              >
                Resolution notes <span className="text-muted-foreground">(optional)</span>
              </label>
              <textarea
                id="resolution-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Describe how the issue was addressed..."
                className="flex min-h-[100px] w-full rounded-md border border-border bg-input px-3 py-2 text-sm outline-none placeholder:text-muted-foreground focus:border-primary focus:ring-1 focus:ring-primary"
                maxLength={2000}
              />
              <div className="flex justify-end text-xs text-muted-foreground">
                <span>{notes.length}/2000</span>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium text-foreground">
                After photos <span className="text-muted-foreground">(optional, max 3)</span>
              </p>
              <PhotoUpload onChange={setImageUrls} />
            </div>
          </div>

          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button
              onClick={handleConfirm}
              disabled={isSubmitting}
            >
              {isSubmitting && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Mark as Resolved
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function RejectButton({
  reportId,
  onReject,
  disabled,
}: {
  reportId: string;
  onReject: (reportId: string, reason: string) => Promise<{ success: boolean; error?: string; warnings?: string[] }>;
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
      showWarnings(result.warnings);
      setOpen(false);
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