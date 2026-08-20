const skeletonCols = [56, 96, 72, 180, 84];

function SkeletonHeader() {
  return (
    <div className="flex h-12 items-center gap-6 border-b border-border px-4">
      {skeletonCols.map((w, i) => (
        <div
          key={i}
          style={{ width: `${w}px` }}
          className="h-3 animate-pulse rounded bg-muted-foreground/15"
        />
      ))}
    </div>
  );
}

export function AdminListSkeleton() {
  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card">
      <SkeletonHeader />
      {Array.from({ length: 8 }).map((_, i) => (
        <div
          key={i}
          className="flex h-14 items-center gap-6 border-b border-border px-4 last:border-b-0"
        >
          {skeletonCols.map((w, j) => (
            <div
              key={j}
              style={{ width: `${w}px` }}
              className="h-3 animate-pulse rounded bg-muted-foreground/10"
            />
          ))}
        </div>
      ))}
    </div>
  );
}