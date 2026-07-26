"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  getAllDrafts,
  deleteDraft,
  updateDraftStatus,
  clearSubmittedDrafts,
  type OfflineDraft,
} from "@/lib/offline/db";
import { processDraft } from "@/lib/offline/queue";
import { useDrafts } from "@/lib/offline/draft-context";
import { Button } from "@/components/ui/button";
import {
  FileText,
  Loader2,
  Trash2,
  Play,
  ExternalLink,
  Wifi,
  WifiOff,
  CheckCircle2,
  XCircle,
  Clock,
} from "lucide-react";

const statusConfig: Record<
  OfflineDraft["status"],
  { label: string; icon: typeof Clock; className: string }
> = {
  draft: {
    label: "Draft",
    icon: FileText,
    className: "text-muted-foreground",
  },
  queued: {
    label: "Queued",
    icon: Clock,
    className: "text-yellow-600 dark:text-yellow-400",
  },
  submitting: {
    label: "Submitting…",
    icon: Loader2,
    className: "text-blue-600 dark:text-blue-400",
  },
  submitted: {
    label: "Submitted",
    icon: CheckCircle2,
    className: "text-status-approved",
  },
  failed: {
    label: "Failed",
    icon: XCircle,
    className: "text-status-rejected",
  },
};

function DraftCard({
  draft,
  onRefresh,
}: {
  draft: OfflineDraft;
  onRefresh: () => void;
}) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const StatusIcon = statusConfig[draft.status].icon;

  const handleSubmit = async () => {
    setSubmitting(true);
    await updateDraftStatus(draft.id, "queued");
    await processDraft(draft);
    onRefresh();
    setSubmitting(false);
  };

  const handleDelete = async () => {
    await deleteDraft(draft.id);
    onRefresh();
  };

  return (
    <div className="rounded-lg border border-border bg-card p-4 transition-colors hover:border-primary/30">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1 space-y-1">
          <h3 className="truncate font-medium text-foreground">
            {draft.formData.title || "Untitled"}
          </h3>
          <div className="flex flex-wrap gap-2">
            <span
              className={`inline-flex items-center gap-1 text-xs ${statusConfig[draft.status].className}`}
            >
              <StatusIcon
                className={`size-3 ${draft.status === "submitting" ? "animate-spin" : ""}`}
              />
              {statusConfig[draft.status].label}
            </span>
            {draft.formData.category && (
              <span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">
                {draft.formData.category.replace(/_/g, " ").toLowerCase()}
              </span>
            )}
            <span className="text-xs text-muted-foreground">
              {new Date(draft.createdAt).toLocaleDateString("en-PH", {
                month: "short",
                day: "numeric",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          </div>
          {draft.error && (
            <p className="text-xs text-status-rejected">{draft.error}</p>
          )}
          {draft.reportId && (
            <p className="text-xs text-status-approved">
              Report ID: {draft.reportId.slice(0, 8)}...
            </p>
          )}
        </div>

        <div className="flex shrink-0 gap-2">
          {draft.status === "draft" && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push(`/submit?draftId=${draft.id}`)}
              >
                <ExternalLink className="mr-1 size-3" />
                Edit
              </Button>
              <Button
                variant="default"
                size="sm"
                disabled={submitting}
                onClick={handleSubmit}
              >
                {submitting ? (
                  <Loader2 className="mr-1 size-3 animate-spin" />
                ) : (
                  <Play className="mr-1 size-3" />
                )}
                Submit
              </Button>
            </>
          )}
          {draft.status === "failed" && (
            <Button
              variant="outline"
              size="sm"
              disabled={submitting}
              onClick={handleSubmit}
            >
              {submitting ? (
                <Loader2 className="mr-1 size-3 animate-spin" />
              ) : (
                <Play className="mr-1 size-3" />
              )}
              Retry
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDelete}
            className="text-muted-foreground hover:text-destructive"
          >
            <Trash2 className="size-3" />
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function MyDraftsPage() {
  const [drafts, setDrafts] = useState<OfflineDraft[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(true);
  const { processing, submitQueue, refreshDrafts } = useDrafts();

  const loadDrafts = async () => {
    setLoading(true);
    const all = await getAllDrafts();
    setDrafts(all);
    setLoading(false);
  };

  useEffect(() => {
    loadDrafts();
    setIsOnline(navigator.onLine);
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const activeDrafts = drafts.filter((d) => d.status !== "submitted");
  const submittedDrafts = drafts.filter((d) => d.status === "submitted");

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            My Drafts
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {activeDrafts.length > 0
              ? `${activeDrafts.length} draft${activeDrafts.length !== 1 ? "s" : ""} pending`
              : "No pending drafts"}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {!isOnline && (
            <span className="flex items-center gap-1 text-xs text-yellow-600 dark:text-yellow-400">
              <WifiOff className="size-3" />
              Offline
            </span>
          )}
          {isOnline && (
            <span className="flex items-center gap-1 text-xs text-status-approved">
              <Wifi className="size-3" />
              Online
            </span>
          )}

          {isOnline && activeDrafts.filter((d) => d.status === "queued" || d.status === "failed").length > 0 && (
            <Button
              variant="outline"
              size="sm"
              disabled={processing}
              onClick={async () => {
                const result = await submitQueue();
                if (result) {
                  await loadDrafts();
                  await refreshDrafts();
                }
              }}
            >
              {processing ? (
                <Loader2 className="mr-1 size-3 animate-spin" />
              ) : (
                <Play className="mr-1 size-3" />
              )}
              Submit All
            </Button>
          )}

          {submittedDrafts.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={async () => {
                await clearSubmittedDrafts();
                await loadDrafts();
                await refreshDrafts();
              }}
            >
              <Trash2 className="mr-1 size-3" />
              Clear submitted
            </Button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-24 animate-pulse rounded-lg bg-muted"
            />
          ))}
        </div>
      ) : drafts.length === 0 ? (
        <div className="flex flex-col items-center gap-4 rounded-lg border border-dashed border-border py-16 text-center">
          <FileText className="size-12 text-muted-foreground/50" />
          <div>
            <p className="font-medium text-foreground">No drafts yet</p>
            <p className="text-sm text-muted-foreground">
              Save a report form as a draft to find it here.
            </p>
          </div>
          <Button onClick={() => window.location.href = "/submit"}>
            Submit a Report
          </Button>
        </div>
      ) : (
        <div className="space-y-6">
          {activeDrafts.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-sm font-medium text-muted-foreground">
                Pending ({activeDrafts.length})
              </h2>
              {activeDrafts.map((draft) => (
                <DraftCard
                  key={draft.id}
                  draft={draft}
                  onRefresh={() => {
                    loadDrafts();
                    refreshDrafts();
                  }}
                />
              ))}
            </div>
          )}

          {submittedDrafts.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-sm font-medium text-muted-foreground">
                Submitted ({submittedDrafts.length})
              </h2>
              {submittedDrafts.map((draft) => (
                <DraftCard
                  key={draft.id}
                  draft={draft}
                  onRefresh={() => {
                    loadDrafts();
                    refreshDrafts();
                  }}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}