import Link from "next/link";
import { cn } from "@/lib/utils";

interface StatusCount {
  label: string;
  count: number;
  href: string;
  color: "pending" | "approved" | "rejected" | "resolved";
}

const colorMap = {
  pending: {
    border: "border-l-status-pending",
    text: "text-status-pending",
  },
  approved: {
    border: "border-l-status-approved",
    text: "text-status-approved",
  },
  rejected: {
    border: "border-l-status-rejected",
    text: "text-status-rejected",
  },
  resolved: {
    border: "border-l-status-resolved",
    text: "text-status-resolved",
  },
} as const;

export function StatusCountCards({ items }: { items: StatusCount[] }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {items.map((item) => {
        const colors = colorMap[item.color];
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex flex-col gap-1 rounded-lg border border-border bg-card p-5 transition-colors hover:border-primary/40",
              "border-l-4",
              colors.border,
            )}
          >
            <span className="text-4xl font-bold text-foreground">
              {item.count}
            </span>
            <span className="text-sm text-muted-foreground">{item.label}</span>
          </Link>
        );
      })}
    </div>
  );
}
