import { Skeleton } from "@/components/ui/skeleton";

export default function MyReportDetailLoading() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
      <Skeleton className="mb-6 h-8 w-36" />
      <div className="mb-8">
        <div className="mb-3 flex gap-2">
          <Skeleton className="h-5 w-20 rounded-md" />
          <Skeleton className="h-5 w-16 rounded-md" />
        </div>
        <Skeleton className="h-8 w-3/4" />
      </div>
      <Skeleton className="mb-8 aspect-[16/10] rounded-lg" />
      <div className="mb-8 flex gap-4">
        <Skeleton className="h-4 w-48" />
        <Skeleton className="h-4 w-32" />
      </div>
      <div className="mb-8 space-y-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-2/3" />
      </div>
      <div>
        <Skeleton className="mb-3 h-4 w-16" />
        <Skeleton className="aspect-[16/9] rounded-lg" />
      </div>
    </div>
  );
}
