import { Skeleton } from "@/components/ui/skeleton";

export default function MyFeedbackDetailLoading() {
  return (
    <div className="mx-auto max-w-3xl py-8">
      <Skeleton className="mb-6 h-4 w-32" />
      <div className="rounded-lg border border-border bg-card p-6">
        <div className="mb-4 flex items-start gap-4">
          <Skeleton className="size-10 rounded-lg" />
          <div className="flex-1">
            <Skeleton className="mb-2 h-4 w-24" />
            <Skeleton className="h-6 w-64" />
          </div>
        </div>
        <Skeleton className="mb-4 h-4 w-48" />
        <Skeleton className="mb-6 h-32 w-full" />
      </div>
    </div>
  );
}
