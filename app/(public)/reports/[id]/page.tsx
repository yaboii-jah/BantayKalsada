import { notFound } from "next/navigation";
import { MOCK_REPORTS } from "@/lib/mock-data";
import { ReportStatusBadge } from "@/components/reports/report-status-badge";
import { PhotoGallery } from "@/components/browse/photo-gallery";
import { ReportMapWrapper } from "@/components/maps/report-map-wrapper";
import { formatReportDate } from "@/lib/date-utils";
import { MapPin, Calendar } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

const categoryLabels: Record<string, string> = {
  POTHOLE: "Pothole",
  FLOODED_ROAD: "Flooded Road",
  ROAD_ACCIDENT: "Road Accident",
  ROAD_RAGE: "Road Rage",
  OTHER: "Other",
};

export default async function ReportDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const report = MOCK_REPORTS.find((r) => r.id === id);

  if (!report) {
    notFound();
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
      <Link href="/browse">
        <Button variant="ghost" size="sm" className="mb-6 -ml-2">
          <ArrowLeft className="mr-1 size-4" />
          Back to reports
        </Button>
      </Link>

      <div className="mb-8">
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <span className="inline-flex items-center rounded-md bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
            {categoryLabels[report.category] ?? report.category}
          </span>
          <ReportStatusBadge status={report.status} />
        </div>
        <h1 className="text-2xl font-semibold text-foreground sm:text-3xl">
          {report.title}
        </h1>
      </div>

      {report.photo_urls.length > 0 && (
        <div className="mb-8">
          <PhotoGallery urls={report.photo_urls} />
        </div>
      )}

      <div className="mb-8 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
        {report.location_label && (
          <span className="flex items-center gap-1.5">
            <MapPin className="size-4" />
            {report.location_label}
          </span>
        )}
        <span className="flex items-center gap-1.5">
          <Calendar className="size-4" />
          {formatReportDate(report.submitted_at)}
        </span>
      </div>

      <div className="mb-8">
        <p className="text-sm leading-relaxed text-foreground">
          {report.description}
        </p>
      </div>

      <div className="mb-8">
        <h2 className="mb-3 text-sm font-semibold text-foreground">
          Location
        </h2>
        <ReportMapWrapper
          latitude={report.latitude}
          longitude={report.longitude}
          locationLabel={report.location_label}
        />
      </div>
    </div>
  );
}
