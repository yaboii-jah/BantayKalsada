import { notFound } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ReportStatusBadge } from "@/components/reports/report-status-badge";
import { PhotoGallery } from "@/components/browse/photo-gallery";
import { ReportMapWrapper } from "@/components/maps/report-map-wrapper";
import { formatReportDate } from "@/lib/date-utils";
import { MapPin, Calendar, XCircle, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

const categoryLabels: Record<string, string> = {
  POTHOLE: "Pothole",
  FLOODED_ROAD: "Flooded Road",
  ROAD_ACCIDENT: "Road Accident",
  ROAD_RAGE: "Road Rage",
  BROKEN_TRAFFIC_SIGN: "Broken Traffic Sign",
  OTHER: "Other",
};

export default async function MyReportDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    notFound();
  }

  const { data: report } = await supabase
    .from("reports")
    .select("*")
    .eq("id", id)
    .eq("submitted_by_id", user.id)
    .single();

  if (!report) {
    notFound();
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
      <Link href="/my-reports">
        <Button variant="ghost" size="sm" className="mb-6 -ml-2">
          <ArrowLeft className="mr-1 size-4" />
          Back to my reports
        </Button>
      </Link>

      <div className="mb-8">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center rounded-md bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
            {categoryLabels[report.category] ?? report.category}
          </span>
          <ReportStatusBadge status={report.status} />
        </div>
        <h1 className="text-2xl font-semibold text-foreground sm:text-3xl">
          {report.title}
        </h1>
      </div>

      {report.status === "REJECTED" && report.rejection_reason && (
        <div className="mb-8 flex items-start gap-3 rounded-lg border border-status-rejected/20 bg-status-rejected/10 px-4 py-3">
          <XCircle className="mt-0.5 size-5 shrink-0 text-status-rejected" />
          <div>
            <p className="text-sm font-medium text-status-rejected">
              Rejected
            </p>
            <p className="mt-1 text-sm text-foreground">
              {report.rejection_reason}
            </p>
          </div>
        </div>
      )}

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
