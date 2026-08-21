import { notFound } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ReportStatusBadge } from "@/components/reports/report-status-badge";
import { PhotoGallery } from "@/components/browse/photo-gallery";
import { ReportMapWrapper } from "@/components/maps/report-map-wrapper";
import { LocationLabel } from "@/components/reports/location-label";
import { ReportTimeline } from "@/components/reports/report-timeline";
import { DuplicateBanner } from "@/components/reports/duplicate-banner";
import { formatReportDate } from "@/lib/date-utils";
import { MapPin, Calendar, XCircle, ArrowLeft, Pencil } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const severityLabels: Record<string, string> = {
  MINOR: "Minor",
  URGENT: "Urgent",
  EMERGENCY: "Emergency",
};

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
      <div className="mb-6 flex items-center justify-between">
        <Button variant="ghost" size="sm" className="-ml-2" asChild>
          <Link href="/my-reports">
            <ArrowLeft className="mr-1 size-4" />
            Back to my reports
          </Link>
        </Button>
        {report.status === "PENDING" && (
          <Button variant="outline" size="sm" asChild>
            <Link href={`/my-reports/${report.id}/edit`}>
              <Pencil className="mr-1 size-4" />
              Edit
            </Link>
          </Button>
        )}
      </div>

      {report.duplicate_of_id && (
        <DuplicateBanner
          duplicateOfId={report.duplicate_of_id}
          href={`/my-reports/${report.duplicate_of_id}`}
        />
      )}

      <div className="mb-8">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center rounded-md bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
            {categoryLabels[report.category] ?? report.category}
          </span>
          <span className={cn("inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-medium", severityStyles[report.severity])}>
            {severityLabels[report.severity]}
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
        <LocationLabel
          label={report.location_label}
          latitude={report.latitude}
          longitude={report.longitude}
          className="flex items-center gap-1.5"
          icon={<MapPin className="size-4" />}
        />
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

      {report.status === "RESOLVED" && report.resolution_notes && (
        <div className="mb-8 border-l-4 border-status-resolved bg-status-resolved/5 pl-4">
          <div className="mb-1 flex items-center gap-2">
            <span className="text-sm font-semibold text-foreground">Resolution Update</span>
            {report.resolved_at && (
              <span className="text-xs text-muted-foreground">
                {formatReportDate(report.resolved_at)}
              </span>
            )}
          </div>
          <p className="text-sm leading-relaxed text-foreground">
            {report.resolution_notes}
          </p>
        </div>
      )}

      {report.status === "RESOLVED" && report.resolved_image_urls != null && report.resolved_image_urls.length > 0 && (
        <div className="mb-8 border-l-4 border-status-resolved pl-4">
          <h3 className="mb-3 text-sm font-semibold text-foreground">
            After Resolution
          </h3>
          <PhotoGallery urls={report.resolved_image_urls} />
        </div>
      )}

      <div className="mb-8">
        <h2 className="mb-3 text-sm font-semibold text-foreground">
          Location
        </h2>
        <div className="aspect-video w-full">
          <ReportMapWrapper
            latitude={report.latitude}
            longitude={report.longitude}
            locationLabel={report.location_label}
          />
        </div>
      </div>

      <ReportTimeline
        reportId={report.id}
        submittedAt={report.submitted_at}
        submittedById={report.submitted_by_id}
        status={report.status}
        reviewedAt={report.reviewed_at}
        reviewedById={report.reviewed_by_id}
        resolvedAt={report.resolved_at}
        rejectionReason={report.rejection_reason}
        resolutionNotes={report.resolution_notes}
      />
    </div>
  );
}
