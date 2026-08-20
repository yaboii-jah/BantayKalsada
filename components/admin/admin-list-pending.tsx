"use client";

import { useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ReportFilterBar } from "@/components/admin/report-filter-bar";
import { AdminListSkeleton } from "@/components/admin/admin-list-skeleton";
import { buildAdminListHref } from "@/lib/admin-report-filters";
import type { Database } from "@/types/database.types";

type ReportCategory = Database["public"]["Enums"]["report_category"];
type Barangay = Database["public"]["Enums"]["barangay"];

interface AdminListPendingProps {
  search: string;
  category: string;
  barangay: string;
  currentPage: number;
  totalPages: number;
  children: React.ReactNode;
}

export function AdminListPending({
  search,
  category,
  barangay,
  currentPage,
  totalPages,
  children,
}: AdminListPendingProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

  const navigate = (next: {
    q: string;
    category?: string;
    barangay?: string;
    page: number;
  }) => {
    startTransition(() => {
      router.push(
        buildAdminListHref(pathname, next.page, {
          q: next.q,
          category: next.category as ReportCategory | undefined,
          barangay: next.barangay as Barangay | undefined,
        }),
      );
    });
  };

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
    <>
      <ReportFilterBar
        search={search}
        category={category}
        barangay={barangay}
        onNavigate={(next) => navigate({ ...next, page: 1 })}
      />
      {isPending ? <AdminListSkeleton /> : children}
      {totalPages > 1 && (
        <nav
          aria-label="Pagination"
          className="mt-4 flex items-center justify-center gap-1"
        >
          {currentPage > 1 && (
            <Button
              variant="ghost"
              size="sm"
              aria-label="Previous page"
              disabled={isPending}
              onClick={() =>
                navigate({ q: search, category, barangay, page: currentPage - 1 })
              }
            >
              <ChevronLeft className="size-4" />
            </Button>
          )}
          {pages.map((page, i) =>
            page === "..." ? (
              <span key={`ellipsis-${i}`} className="px-2 text-muted-foreground">
                ...
              </span>
            ) : (
              <Button
                key={page}
                variant={page === currentPage ? "default" : "ghost"}
                size="sm"
                className="min-w-9"
                disabled={isPending}
                onClick={() =>
                  navigate({ q: search, category, barangay, page })
                }
              >
                {page}
              </Button>
            ),
          )}
          {currentPage < totalPages && (
            <Button
              variant="ghost"
              size="sm"
              aria-label="Next page"
              disabled={isPending}
              onClick={() =>
                navigate({ q: search, category, barangay, page: currentPage + 1 })
              }
            >
              <ChevronRight className="size-4" />
            </Button>
          )}
        </nav>
      )}
    </>
  );
}