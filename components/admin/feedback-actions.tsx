"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { acknowledgeFeedback, closeFeedback } from "@/app/admin/actions";
import { Button } from "@/components/ui/button";
import { CheckCircle, XCircle, Loader2 } from "lucide-react";

interface FeedbackActionsProps {
  feedbackId: string;
  status: string;
}

export function FeedbackActions({ feedbackId, status }: FeedbackActionsProps) {
  const router = useRouter();
  const [ackPending, startAckTransition] = useTransition();
  const [closePending, startCloseTransition] = useTransition();

  const handleAcknowledge = () => {
    startAckTransition(async () => {
      const result = await acknowledgeFeedback(feedbackId);
      if (result.success) {
        toast.success("Feedback acknowledged");
        router.refresh();
      } else {
        toast.error(result.error ?? "Failed to acknowledge feedback");
      }
    });
  };

  const handleClose = () => {
    startCloseTransition(async () => {
      const result = await closeFeedback(feedbackId);
      if (result.success) {
        toast.success("Feedback closed");
        router.refresh();
      } else {
        toast.error(result.error ?? "Failed to close feedback");
      }
    });
  };

  if (status === "CLOSED") return null;

  return (
    <div className="flex justify-end gap-3 border-t border-border pt-6">
      {status === "OPEN" && (
        <Button
          variant="default"
          onClick={handleAcknowledge}
          disabled={ackPending}
        >
          {ackPending ? (
            <Loader2 className="mr-2 size-4 animate-spin" />
          ) : (
            <CheckCircle className="mr-2 size-4" />
          )}
          Acknowledge
        </Button>
      )}
      {status !== "CLOSED" && (
        <Button
          variant="outline"
          onClick={handleClose}
          disabled={closePending}
        >
          {closePending ? (
            <Loader2 className="mr-2 size-4 animate-spin" />
          ) : (
            <XCircle className="mr-2 size-4" />
          )}
          Close
        </Button>
      )}
    </div>
  );
}
