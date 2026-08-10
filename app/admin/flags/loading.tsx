export default function AdminFlagsLoading() {
  return (
    <div>
      <div className="mb-6 h-8 w-52 animate-pulse rounded-md bg-muted-foreground/10" />
      <div className="rounded-lg border border-border bg-card">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center justify-between gap-4 border-b border-border px-4 py-4 last:border-b-0"
          >
            <div className="min-w-0 flex-1 space-y-2">
              <div className="h-4 w-2/3 animate-pulse rounded-md bg-muted-foreground/10" />
              <div className="h-3 w-1/3 animate-pulse rounded-md bg-muted-foreground/10" />
            </div>
            <div className="size-4 animate-pulse rounded-md bg-muted-foreground/10" />
          </div>
        ))}
      </div>
    </div>
  );
}
