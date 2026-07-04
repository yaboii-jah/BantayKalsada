export default function AdminReportLoading() {
  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-6">
        <div className="mb-2 h-5 w-32 animate-pulse rounded-md bg-muted-foreground/10" />
        <div className="h-8 w-96 animate-pulse rounded-md bg-muted-foreground/10" />
      </div>
      <div className="mb-6 h-64 animate-pulse rounded-lg bg-muted-foreground/10" />
      <div className="mb-6 space-y-2 rounded-lg border border-border bg-card p-6">
        <div className="h-4 w-full animate-pulse rounded-md bg-muted-foreground/10" />
        <div className="h-4 w-3/4 animate-pulse rounded-md bg-muted-foreground/10" />
        <div className="h-4 w-1/2 animate-pulse rounded-md bg-muted-foreground/10" />
      </div>
      <div className="mb-6 h-[300px] animate-pulse rounded-lg bg-muted-foreground/10" />
      <div className="mb-6 h-32 animate-pulse rounded-lg bg-muted-foreground/10" />
    </div>
  );
}
