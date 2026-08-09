import Link from "next/link";
import { Copy } from "lucide-react";

export function DuplicateBanner({
  duplicateOfId,
  href,
}: {
  duplicateOfId: string;
  href: string;
}) {
  return (
    <div className="mb-6 flex items-start gap-3 rounded-lg border border-yellow-500/30 bg-yellow-500/10 px-4 py-3">
      <Copy className="mt-0.5 size-5 shrink-0 text-yellow-600" />
      <div className="text-sm">
        <p className="font-medium text-foreground">
          This report is a duplicate
        </p>
        <p className="mt-0.5 text-muted-foreground">
          It was linked to the canonical report{" "}
          <Link
            href={href}
            className="font-medium text-primary underline-offset-2 hover:underline"
          >
            #{duplicateOfId.slice(0, 8)}
          </Link>
          . Comments, flags, and photos may have been merged there.
        </p>
      </div>
    </div>
  );
}
