export default function AdminLoading() {
  return (
    <div>
      <div className="mb-6 h-8 w-48 animate-pulse rounded-md bg-muted-foreground/10" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="flex flex-col gap-2 rounded-lg border border-border bg-card p-5"
          >
            <div className="h-10 w-16 animate-pulse rounded-md bg-muted-foreground/10" />
            <div className="h-4 w-24 animate-pulse rounded-md bg-muted-foreground/10" />
          </div>
        ))}
      </div>
    </div>
  );
}
