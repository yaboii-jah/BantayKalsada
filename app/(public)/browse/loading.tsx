import { Skeleton } from "@/components/ui/skeleton";

export default function BrowseLoading() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="mt-2 h-5 w-96" />
      </div>

      <div className="mb-6 flex items-center gap-3">
        <Skeleton className="h-10 w-44" />
        <Skeleton className="h-10 w-40" />
        <Skeleton className="h-5 w-24" />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="overflow-hidden rounded-lg border border-border">
            <Skeleton className="aspect-[4/3] rounded-none" />
            <div className="space-y-2 p-4">
              <div className="flex gap-2">
                <Skeleton className="h-5 w-16 rounded-md" />
                <Skeleton className="h-5 w-16 rounded-md" />
              </div>
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-24" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
