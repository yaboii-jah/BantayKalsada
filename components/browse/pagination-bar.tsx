import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

export function PaginationBar({
  currentPage,
  totalPages,
  buildHref,
}: {
  currentPage: number;
  totalPages: number;
  buildHref: (page: number) => string;
}) {
  if (totalPages <= 1) return null;

  const pages: (number | "...")[] = [];
  for (let i = 1; i <= totalPages; i++) {
    if (
      i === 1 ||
      i === totalPages ||
      (i >= currentPage - 1 && i <= currentPage + 1)
    ) {
      pages.push(i);
    } else if (pages[pages.length - 1] !== "...") {
      pages.push("...");
    }
  }

  return (
    <nav
      aria-label="Pagination"
      className="flex items-center justify-center gap-1"
    >
      {currentPage > 1 && (
        <Link href={buildHref(currentPage - 1)}>
          <Button variant="ghost" size="sm" aria-label="Previous page">
            <ChevronLeft className="size-4" />
          </Button>
        </Link>
      )}
      {pages.map((page, i) =>
        page === "..." ? (
          <span key={`ellipsis-${i}`} className="px-2 text-muted-foreground">
            ...
          </span>
        ) : (
          <Link key={page} href={buildHref(page)}>
            <Button
              variant={page === currentPage ? "default" : "ghost"}
              size="sm"
              className="min-w-9"
            >
              {page}
            </Button>
          </Link>
        ),
      )}
      {currentPage < totalPages && (
        <Link href={buildHref(currentPage + 1)}>
          <Button variant="ghost" size="sm" aria-label="Next page">
            <ChevronRight className="size-4" />
          </Button>
        </Link>
      )}
    </nav>
  );
}
