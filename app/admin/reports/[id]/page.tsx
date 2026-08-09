import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/service-role";
import { ReportStatusBadge } from "@/components/reports/report-status-badge";
import { PhotoGallery } from "@/components/browse/photo-gallery";
import { ReportMapWrapper } from "@/components/maps/report-map-wrapper";
import { AdminReportActions } from "./admin-report-actions";
import { ReportTimeline } from "@/components/reports/report-timeline";
import { DuplicateManager } from "@/components/admin/duplicate-manager";
import { DuplicateBanner } from "@/components/reports/duplicate-banner";
import { formatReportDate } from "@/lib/date-utils";
import { MapPin, Calendar, User, AlertCircle, Building2, CheckCheck, Flag, Pencil } from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";

const flagLabels: Record<string, string> = {
  ALREADY_FIXED: "Already fixed",
  WRONG_LOCATION: "Wrong location",
};

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

export const dynamic = "force-dynamic";

const categoryLabels: Record<string, string> = {
  POTHOLE: "Pothole",
  FLOODED_ROAD: "Flooded Road",
  ROAD_ACCIDENT: "Road Accident",
  ROAD_RAGE: "Road Rage",
  BROKEN_TRAFFIC_SIGN: "Broken Traffic Sign",
  OTHER: "Other",
};

const barangayLabels: Record<string, string> = {
  DOLORES: "Dolores",
  SAN_ISIDRO: "San Isidro",
  SAN_JUAN: "San Juan",
  SANTA_ANA: "Santa Ana",
  MUZON: "Muzon",
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

  const { data: flags } = await adminClient
    .from("report_flags")
    .select("id, flag_type, created_at, user_id")
    .eq("report_id", report.id)
    .order("created_at", { ascending: true });

  const flaggerIds = [...new Set((flags ?? []).map((f) => f.user_id))];
  const { data: flaggerProfiles } = flaggerIds.length
    ? await adminClient
        .from("profiles")
        .select("id, full_name")
        .in("id", flaggerIds)
    : { data: null };

  const flaggerName = (userId: string): string =>
    flaggerProfiles?.find((p) => p.id === userId)?.full_name ?? "Unknown";

  return (
    <div className="mx-auto max-w-4xl">
      {report.duplicate_of_id && (
        <DuplicateBanner
          duplicateOfId={report.duplicate_of_id}
          href={`/admin/reports/${report.duplicate_of_id}`}
        />
      )}
      <div className="mb-6">
        <div className="mb-2 flex items-center gap-2">
          <span className="inline-flex items-center rounded-md bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
            {categoryLabels[report.category] ?? report.category}
          </span>
          <span className={cn("inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium", severityStyles[report.severity])}>
            {severityLabels[report.severity]}
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
          {report.barangay && (
            <div className="flex items-center gap-1 pt-1 text-xs text-muted-foreground">
              <Building2 className="h-3 w-3" />
              Barangay {barangayLabels[report.barangay] ?? report.barangay}
            </div>
          )}
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

      <div className="mb-6 rounded-lg border border-border bg-card p-6">
        <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
          <Flag className="h-4 w-4 text-yellow-600" />
          Citizen Flags
        </h2>
        {flags && flags.length > 0 ? (
          <ul className="space-y-2">
            {flags.map((flag) => (
              <li key={flag.id} className="flex items-center justify-between gap-2 rounded-md bg-muted px-3 py-2 text-sm">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-foreground">
                    {flagLabels[flag.flag_type] ?? flag.flag_type}
                  </span>
                  <span className="text-muted-foreground">
                    by {flaggerName(flag.user_id)}
                  </span>
                </div>
                <span className="text-xs text-muted-foreground">
                  {new Date(flag.created_at).toLocaleDateString("fil-PH", {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  })}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">
            No flags from citizens on this report.
          </p>
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

      {report.status === "RESOLVED" && report.resolution_notes && (
        <div className="mb-6 rounded-lg border border-status-resolved/20 bg-status-resolved/5 p-4">
          <div className="flex items-start gap-2">
            <CheckCheck className="mt-0.5 h-4 w-4 shrink-0 text-status-resolved" />
            <div>
              <p className="text-sm font-medium text-status-resolved">
                Resolution notes
              </p>
              <p className="mt-1 text-sm text-foreground">
                {report.resolution_notes}
              </p>
            </div>
          </div>
        </div>
      )}

      {report.status === "RESOLVED" && report.resolved_image_urls != null && report.resolved_image_urls.length > 0 && (
        <div className="mb-6 overflow-hidden rounded-lg border border-border bg-card">
          <div className="p-2">
            <PhotoGallery urls={report.resolved_image_urls} />
          </div>
        </div>
      )}

      <div className="mb-6">
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

      <AdminReportActions
        reportId={report.id}
        status={report.status}
      />

      <div className="mt-4">
        <DuplicateManager
          reportId={report.id}
          duplicateOfId={report.duplicate_of_id}
        />
      </div>

      <div className="mt-6 flex justify-end">
        <Link
          href={`/admin/reports/${report.id}/edit`}
          className="inline-flex items-center gap-2 rounded-lg border border-input px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
        >
          <Pencil className="size-4" />
          Edit report
        </Link>
      </div>
    </div>
  );
}
