export default function AdminPendingLoading() {
  return (
    <div>
      <div className="mb-6 h-8 w-56 animate-pulse rounded-md bg-muted-foreground/10" />
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="h-12 animate-pulse rounded-md bg-muted-foreground/10"
          />
        ))}
      </div>
    </div>
  );
}
