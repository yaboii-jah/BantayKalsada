import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { headers } from "next/headers";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ReportStatusBadge } from "@/components/reports/report-status-badge";
import { PhotoGallery } from "@/components/browse/photo-gallery";
import { ReportMapWrapper } from "@/components/maps/report-map-wrapper";
import { formatReportDate } from "@/lib/date-utils";
import { getDisplayUrl } from "@/lib/cloudinary-url";
import { MapPin, Calendar, Building2 } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { ShareButton } from "@/components/reports/share-button";
import { CommentSection } from "@/components/reports/comment-section";
import { FlagReportButtons } from "@/components/reports/flag-report-buttons";
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
  OTHER: "Other",
};

const barangayLabels: Record<string, string> = {
  DOLORES: "Dolores",
  SAN_ISIDRO: "San Isidro",
  SAN_JUAN: "San Juan",
  SANTA_ANA: "Santa Ana",
  MUZON: "Muzon",
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();

  const { data: report } = await supabase
    .from("reports")
    .select("title, description, photo_urls")
    .eq("id", id)
    .in("status", ["APPROVED", "RESOLVED"])
    .single();

  if (!report) return {};

  const headersList = await headers();
  const host = headersList.get("host") ?? "bantay-kalsada-sooty.vercel.app";
  const protocol = headersList.get("x-forwarded-proto") ?? "https";
  const url = `${protocol}://${host}/reports/${id}`;

  const ogDescription =
    report.description.length > 160
      ? report.description.slice(0, 157).trim() + "..."
      : report.description;

  const image = report.photo_urls[0] ? getDisplayUrl(report.photo_urls[0]) : undefined;

  return {
    title: report.title,
    description: ogDescription,
    openGraph: {
      title: report.title,
      description: ogDescription,
      url,
      siteName: "Bantay Kalsada",
      type: "article",
      ...(image && { images: [{ url: image, width: 1200, height: 900 }] }),
    },
    twitter: {
      card: "summary_large_image",
      title: report.title,
      description: ogDescription,
      ...(image && { images: [image] }),
    },
  };
}

export default async function ReportDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();

  const { data: report } = await supabase
    .from("reports")
    .select("*")
    .eq("id", id)
    .in("status", ["APPROVED", "RESOLVED"])
    .single();

  if (!report) {
    notFound();
  }

  const { data: { user } } = await supabase.auth.getUser();

  const { data: profile } = user
    ? await supabase.from("profiles").select("role").eq("id", user.id).single()
    : { data: null };

  const isAdmin = profile?.role === "ADMIN";

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6 flex items-center justify-between">
        <Link href="/browse">
          <Button variant="ghost" size="sm" className="-ml-2">
            <ArrowLeft className="mr-1 size-4" />
            Back to reports
          </Button>
        </Link>
        <ShareButton title={report.title} />
      </div>

      <div className="mb-8">
        <div className="flex flex-wrap items-center gap-2 mb-3">
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
        {report.barangay && (
          <span className="flex items-center gap-1.5">
            <Building2 className="size-4" />
            Barangay {barangayLabels[report.barangay] ?? report.barangay}
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

      {user && user.id !== report.submitted_by_id && (
        <div className="mb-8 border-t pt-6">
          <FlagReportButtons reportId={report.id} />
        </div>
      )}

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
        <ReportMapWrapper
          latitude={report.latitude}
          longitude={report.longitude}
          locationLabel={report.location_label}
        />
      </div>

      <CommentSection
        reportId={report.id}
        currentUserId={user?.id ?? null}
        isAdmin={isAdmin}
      />
    </div>
  );
}
