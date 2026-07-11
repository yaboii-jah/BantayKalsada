import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { headers } from "next/headers";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ReportStatusBadge } from "@/components/reports/report-status-badge";
import { PhotoGallery } from "@/components/browse/photo-gallery";
import { ReportMapWrapper } from "@/components/maps/report-map-wrapper";
import { formatReportDate } from "@/lib/date-utils";
import { getDisplayUrl } from "@/lib/cloudinary-url";
import { MapPin, Calendar, Share2 } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { ShareButton } from "@/components/reports/share-button";

const categoryLabels: Record<string, string> = {
  POTHOLE: "Pothole",
  FLOODED_ROAD: "Flooded Road",
  ROAD_ACCIDENT: "Road Accident",
  ROAD_RAGE: "Road Rage",
  OTHER: "Other",
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
  const host = headersList.get("host") ?? "bantay-kalsada.vercel.app";
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
