export default function AdminReportEditLoading() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6 h-7 w-28 animate-pulse rounded-md bg-muted-foreground/10" />

      <div className="mb-2 h-8 w-48 animate-pulse rounded-md bg-muted-foreground/10" />
      <div className="mb-8 h-4 w-96 animate-pulse rounded-md bg-muted-foreground/10" />

      <div className="space-y-6">
        <div className="space-y-2">
          <div className="h-4 w-16 animate-pulse rounded-md bg-muted-foreground/10" />
          <div className="h-9 w-full animate-pulse rounded-md bg-muted-foreground/10" />
        </div>
        <div className="space-y-2">
          <div className="h-4 w-10 animate-pulse rounded-md bg-muted-foreground/10" />
          <div className="h-9 w-full animate-pulse rounded-md bg-muted-foreground/10" />
        </div>
        <div className="space-y-2">
          <div className="h-4 w-20 animate-pulse rounded-md bg-muted-foreground/10" />
          <div className="h-[120px] w-full animate-pulse rounded-md bg-muted-foreground/10" />
        </div>
        <div className="space-y-3">
          <div className="h-4 w-14 animate-pulse rounded-md bg-muted-foreground/10" />
          <div className="flex gap-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="h-9 w-28 animate-pulse rounded-lg bg-muted-foreground/10"
              />
            ))}
          </div>
        </div>
        <div className="space-y-2">
          <div className="h-4 w-16 animate-pulse rounded-md bg-muted-foreground/10" />
          <div className="h-9 w-full animate-pulse rounded-md bg-muted-foreground/10" />
        </div>
        <div className="space-y-2">
          <div className="h-4 w-12 animate-pulse rounded-md bg-muted-foreground/10" />
          <div className="flex gap-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="size-24 animate-pulse rounded-lg bg-muted-foreground/10"
              />
            ))}
          </div>
        </div>
        <div className="space-y-2">
          <div className="h-4 w-16 animate-pulse rounded-md bg-muted-foreground/10" />
          <div className="h-[400px] w-full animate-pulse rounded-md bg-muted-foreground/10" />
        </div>
        <div className="h-10 w-full animate-pulse rounded-md bg-muted-foreground/10" />
      </div>
    </div>
  );
}
