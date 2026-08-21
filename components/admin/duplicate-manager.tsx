"use client";

import { useCallback, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Copy, Merge, Loader2, Search, Link2, Unlink, X } from "lucide-react";

import {
  findDuplicateCandidates,
  linkDuplicate,
  unlinkDuplicate,
  mergeReports,
  type DuplicateCandidate,
} from "@/app/admin/actions";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatReportDate } from "@/lib/date-utils";
import { ReportStatusBadge } from "@/components/reports/report-status-badge";
import { cn } from "@/lib/utils";

export function DuplicateManager({
  reportId,
  duplicateOfId,
  className,
}: {
  reportId: string;
  duplicateOfId: string | null;
  className?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [candidates, setCandidates] = useState<DuplicateCandidate[] | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [mergeConfirm, setMergeConfirm] = useState(false);

  const search = useCallback(
    (q?: string) => {
      startTransition(async () => {
        const result = await findDuplicateCandidates(reportId, q);
        if (result.success) {
          setCandidates(result.candidates ?? []);
        } else {
          toast.error(result.error ?? "Failed to search for duplicates");
        }
      });
    },
    [reportId],
  );

  const handleOpen = useCallback(() => {
    setOpen(true);
    search();
  }, [search]);

  const handleQueryChange = useCallback(
    (value: string) => {
      setQuery(value);
      if (value.trim().length >= 3) {
        search(value);
      } else if (value.trim().length === 0) {
        search();
      }
    },
    [search],
  );

  const handleLink = useCallback(
    (canonicalId: string) => {
      startTransition(async () => {
        const result = await linkDuplicate(reportId, canonicalId);
        if (result.success) {
          toast.success("Report linked as duplicate.");
          router.refresh();
          setOpen(false);
        } else {
          toast.error(result.error ?? "Failed to link duplicate");
        }
      });
    },
    [reportId, router],
  );

  const handleUnlink = useCallback(() => {
    startTransition(async () => {
      const result = await unlinkDuplicate(reportId);
      if (result.success) {
        toast.success("Duplicate link removed.");
        router.refresh();
      } else {
        toast.error(result.error ?? "Failed to unlink duplicate");
      }
    });
  }, [reportId, router]);

  const handleMerge = useCallback(
    (canonicalId: string) => {
      startTransition(async () => {
        const result = await mergeReports(reportId, canonicalId);
        if (result.success) {
          toast.success("Report merged into the canonical report.");
          router.refresh();
          setOpen(false);
          setMergeConfirm(false);
        } else {
          toast.error(result.error ?? "Failed to merge reports");
        }
      });
    },
    [reportId, router],
  );

  const selectedCandidate = candidates?.find((c) => c.id === selected);

  return (
    <>
      <div className={cn(className, "flex w-full items-center gap-2 sm:w-auto")}>
        <Button
          type="button"
          variant="outline"
          size="lg"
          className="flex-1 sm:flex-initial"
          onClick={handleOpen}
        >
          <Copy className="mr-1 size-4" />
          Duplicate manager
        </Button>
        {duplicateOfId && (
          <Button
            type="button"
            variant="outline"
            size="lg"
            className="flex-1 sm:flex-initial"
            onClick={handleUnlink}
          >
            <Unlink className="mr-1 size-4" />
            Unlink
          </Button>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Manage duplicates</DialogTitle>
            <DialogDescription>
              Find nearby or similarly titled reports and link this report as a
              duplicate, or merge its comments, flags, and photos into the
              canonical report.
            </DialogDescription>
          </DialogHeader>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => handleQueryChange(e.target.value)}
              placeholder="Search by title…"
              className="pl-9"
            />
          </div>

          <div className="max-h-72 space-y-2 overflow-y-auto">
            {isPending && candidates === null ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="size-5 animate-spin text-muted-foreground" />
              </div>
            ) : candidates && candidates.length > 0 ? (
              candidates.map((candidate) => (
                <button
                  key={candidate.id}
                  type="button"
                  onClick={() => setSelected(candidate.id)}
                  className={`flex w-full items-center justify-between gap-3 rounded-lg border px-3 py-2 text-left text-sm transition-colors ${
                    selected === candidate.id
                      ? "border-primary bg-primary/5"
                      : "border-border hover:bg-accent"
                  }`}
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium text-foreground">
                      {candidate.title}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      #{candidate.id.slice(0, 8)} ·{" "}
                      {formatReportDate(candidate.submitted_at)}
                      {candidate.distance_m != null && (
                        <> · {Math.round(candidate.distance_m)}m away</>
                      )}
                    </p>
                  </div>
                  <ReportStatusBadge status={candidate.status} />
                </button>
              ))
            ) : (
              <p className="py-8 text-center text-sm text-muted-foreground">
                No duplicate candidates found.
              </p>
            )}
          </div>

          <DialogFooter className="gap-2 sm:justify-between">
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={!selected}
                onClick={() => selected && handleLink(selected)}
              >
                <Link2 className="mr-1 size-4" />
                Link as duplicate
              </Button>
              <Button
                type="button"
                variant="destructive"
                size="sm"
                disabled={!selected}
                onClick={() => selected && setMergeConfirm(true)}
              >
                <Merge className="mr-1 size-4" />
                Merge
              </Button>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setOpen(false)}
            >
              <X className="mr-1 size-4" />
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={mergeConfirm} onOpenChange={setMergeConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Merge into canonical report?</DialogTitle>
            <DialogDescription>
              Comments, flags, and photos from this report will be moved to
              &quot;{selectedCandidate?.title ?? "the selected report"}&quot;.
              This report will be retired as a duplicate. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setMergeConfirm(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={isPending}
              onClick={() => selected && handleMerge(selected)}
            >
              {isPending ? (
                <Loader2 className="mr-1 size-4 animate-spin" />
              ) : (
                <Merge className="mr-1 size-4" />
              )}
              Merge reports
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
