import { Skeleton } from "@/components/ui/skeleton";

export default function MyFeedbackDetailLoading() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
      <Skeleton className="mb-6 h-4 w-40" />

      <div className="rounded-lg border border-border bg-card p-6">
        <div className="mb-4 flex items-start gap-4">
          <Skeleton className="size-10 shrink-0 rounded-lg" />
          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-2">
              <Skeleton className="h-5 w-20 rounded-md" />
              <Skeleton className="h-5 w-24 rounded-md" />
            </div>
            <Skeleton className="h-7 w-3/4" />
          </div>
        </div>

        <div className="mb-6 flex items-center gap-4">
          <Skeleton className="h-3.5 w-32" />
          <Skeleton className="h-3.5 w-16" />
        </div>

        <Skeleton className="mb-6 h-32 w-full rounded-lg" />

        <Skeleton className="h-48 w-full rounded-xl" />
      </div>
    </div>
  );
}
