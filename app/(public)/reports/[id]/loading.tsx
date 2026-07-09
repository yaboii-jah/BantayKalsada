import { Skeleton } from "@/components/ui/skeleton";

export default function ReportDetailLoading() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
      <Skeleton className="mb-6 h-9 w-32" />

      <div className="mb-8">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <Skeleton className="h-5 w-20 rounded-md" />
          <Skeleton className="h-5 w-24 rounded-md" />
        </div>
        <Skeleton className="h-9 w-3/4 sm:h-10" />
      </div>

      <Skeleton className="mb-8 h-64 w-full rounded-xl" />

      <div className="mb-8 flex flex-wrap items-center gap-4">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-4 w-32" />
      </div>

      <div className="mb-8 space-y-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
      </div>

      <div className="mb-8">
        <Skeleton className="mb-3 h-4 w-16" />
        <Skeleton className="h-48 w-full rounded-xl" />
      </div>
    </div>
  );
}
