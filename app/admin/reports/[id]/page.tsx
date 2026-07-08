import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/service-role";
import { ReportStatusBadge } from "@/components/reports/report-status-badge";
import { PhotoGallery } from "@/components/browse/photo-gallery";
import { ReportMapWrapper } from "@/components/maps/report-map-wrapper";
import { AdminReportActions } from "./admin-report-actions";
import { formatReportDate } from "@/lib/date-utils";
import { MapPin, Calendar, User, AlertCircle } from "lucide-react";

export const dynamic = "force-dynamic";

const categoryLabels: Record<string, string> = {
  POTHOLE: "Pothole",
  FLOODED_ROAD: "Flooded Road",
  ROAD_ACCIDENT: "Road Accident",
  ROAD_RAGE: "Road Rage",
  OTHER: "Other",
};

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function AdminReportReviewPage({ params }: PageProps) {
  const { id } = await params;
  const adminClient = createAdminClient();

  const { data: report } = await adminClient
    .from("reports")
    .select("*")
    .eq("id", id)
    .single();

  if (!report) {
    notFound();
  }

  const { data: submitter } = await adminClient
    .from("profiles")
    .select("full_name, email")
    .eq("id", report.submitted_by_id)
    .single();

  const reviewer = report.reviewed_by_id
    ? await adminClient
        .from("profiles")
        .select("full_name")
        .eq("id", report.reviewed_by_id)
        .single()
    : null;

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-6">
        <div className="mb-2 flex items-center gap-2">
          <span className="inline-flex items-center rounded-md bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
            {categoryLabels[report.category] ?? report.category}
          </span>
          <ReportStatusBadge status={report.status} />
          <span className="ml-auto text-sm text-muted-foreground">
            {formatReportDate(report.submitted_at)}
          </span>
        </div>
        <h1 className="text-2xl font-bold text-foreground">
          {report.title}
        </h1>
      </div>

      {report.photo_urls.length > 0 && (
        <div className="mb-6 overflow-hidden rounded-lg border border-border bg-card">
          <PhotoGallery urls={report.photo_urls} />
        </div>
      )}

      <div className="mb-6 rounded-lg border border-border bg-card p-6">
        <p className="text-sm leading-relaxed text-foreground">
          {report.description}
        </p>
      </div>

      <div className="mb-6 overflow-hidden rounded-lg border border-border">
        <div className="h-[300px]">
          <ReportMapWrapper
            latitude={report.latitude}
            longitude={report.longitude}
            locationLabel={report.location_label}
          />
        </div>
        {report.location_label && (
          <div className="flex items-center gap-2 border-t border-border bg-card px-4 py-2 text-sm text-muted-foreground">
            <MapPin className="h-4 w-4 shrink-0" />
            <span>{report.location_label}</span>
            <span className="ml-auto font-mono text-xs">
              {report.latitude.toFixed(4)}, {report.longitude.toFixed(4)}
            </span>
          </div>
        )}
      </div>

      <div className="mb-6 rounded-lg border border-border bg-card p-6">
        <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
          <User className="h-4 w-4" />
          Submitted by
        </h2>
        <div className="space-y-1 text-sm">
          <p className="font-medium text-foreground">
            {submitter?.full_name ?? "Unknown"}
          </p>
          <p className="text-muted-foreground">
            {submitter?.email ?? "Unknown"}
          </p>
          <div className="flex items-center gap-1 pt-1 text-xs text-muted-foreground">
            <Calendar className="h-3 w-3" />
            Submitted on{" "}
            {new Date(report.submitted_at).toLocaleDateString("fil-PH", {
              year: "numeric",
              month: "long",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </div>
        </div>
        {report.reviewed_at && (
          <div className="mt-2 border-t border-border pt-2 text-xs text-muted-foreground">
            Reviewed by {reviewer?.data?.full_name ?? "Unknown"} on{" "}
            {new Date(report.reviewed_at).toLocaleDateString("fil-PH", {
              year: "numeric",
              month: "long",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
            {report.resolved_at && (
              <>
                <span className="mx-1">·</span>
                Resolved on{" "}
                {new Date(report.resolved_at).toLocaleDateString("fil-PH", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </>
            )}
          </div>
        )}
      </div>

      {report.status === "REJECTED" && report.rejection_reason && (
        <div className="mb-6 rounded-lg border border-status-rejected/20 bg-status-rejected/10 p-4">
          <div className="flex items-start gap-2">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-status-rejected" />
            <div>
              <p className="text-sm font-medium text-status-rejected">
                Rejection reason
              </p>
              <p className="mt-1 text-sm text-foreground">
                {report.rejection_reason}
              </p>
            </div>
          </div>
        </div>
      )}

      <AdminReportActions
        reportId={report.id}
        status={report.status}
      />
    </div>
  );
}
