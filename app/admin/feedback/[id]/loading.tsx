import { Skeleton } from "@/components/ui/skeleton";

export default function AdminFeedbackReviewLoading() {
  return (
    <div className="mx-auto max-w-4xl">
      <Skeleton className="mb-6 h-4 w-32" />
      <div className="rounded-lg border border-border bg-card p-6">
        <div className="mb-4 flex items-start gap-4">
          <Skeleton className="size-10 rounded-lg" />
          <div className="flex-1">
            <Skeleton className="mb-2 h-4 w-24" />
            <Skeleton className="h-6 w-64" />
          </div>
        </div>
        <Skeleton className="mb-4 h-4 w-96" />
        <Skeleton className="mb-6 h-32 w-full" />
        <Skeleton className="h-20 w-full" />
      </div>
    </div>
  );
}
