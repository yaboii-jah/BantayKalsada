import Link from "next/link";
import type { Database } from "@/types/database.types";
import { ReportStatusBadge } from "@/components/reports/report-status-badge";
import { cn } from "@/lib/utils";
import { getDisplayUrl } from "@/lib/cloudinary-url";
import { formatReportDate } from "@/lib/date-utils";

type ReportRow = Database["public"]["Tables"]["reports"]["Row"];

const severityStyles: Record<string, string> = {
  MINOR: "border-status-approved/30 bg-status-approved/10 text-status-approved",
  URGENT: "border-yellow-500/30 bg-yellow-500/10 text-yellow-500",
  EMERGENCY: "border-status-rejected/30 bg-status-rejected/10 text-status-rejected",
};

const categoryLabels: Record<string, string> = {
  POTHOLE: "Pothole",
  FLOODED_ROAD: "Flooded Road",
  ROAD_ACCIDENT: "Road Accident",
  ROAD_RAGE: "Road Rage",
  OTHER: "Other",
};

const barangayLabels: Record<string, string> = {
  DOLORES: "Dolores",
  SAN_ISIDRO: "San Isidro",
  SAN_JUAN: "San Juan",
  SANTA_ANA: "Santa Ana",
  MUZON: "Muzon",
};

export function ReportCard({
  report,
  className,
  href,
}: {
  report: ReportRow;
  className?: string;
  href?: string;
}) {
  const thumbnail =
    report.photo_urls.length > 0 ? getDisplayUrl(report.photo_urls[0]) : null;

  return (
    <Link
      href={href ?? `/reports/${report.id}`}
      className={cn(
        "group flex flex-col overflow-hidden rounded-lg border border-border bg-card transition-colors hover:border-primary/40",
        className,
      )}
    >
      {thumbnail && (
        <div className="aspect-[4/3] overflow-hidden bg-muted">
          <img
            src={thumbnail}
            alt={report.title}
            className="size-full object-cover transition-transform duration-300 group-hover:scale-105"
            loading="lazy"
          />
        </div>
      )}
      <div className="flex flex-1 flex-col gap-2 p-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center rounded-md bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
            {categoryLabels[report.category] ?? report.category}
          </span>
          {report.severity !== "MINOR" && (
            <span className={cn("inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium", severityStyles[report.severity])}>
              {report.severity === "URGENT" ? "Urgent" : "Emergency"}
            </span>
          )}
          <ReportStatusBadge status={report.status} />
          <span className="ml-auto text-xs text-muted-foreground">
            {formatReportDate(report.submitted_at)}
          </span>
        </div>
        <h3 className="line-clamp-2 text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
          {report.title}
        </h3>
        {report.location_label && (
          <p className="mt-auto text-xs text-muted-foreground">
            {report.location_label}
          </p>
        )}
        {report.barangay && (
          <p className="text-xs text-muted-foreground">
            Barangay {barangayLabels[report.barangay] ?? report.barangay}
          </p>
        )}
      </div>
    </Link>
  );
}
