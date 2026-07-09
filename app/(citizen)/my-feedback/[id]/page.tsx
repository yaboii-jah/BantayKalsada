import { notFound, redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { formatReportDate } from "@/lib/date-utils";
import { PhotoGallery } from "@/components/browse/photo-gallery";
import {
  Star,
  Bug,
  Lightbulb,
  MessageSquare,
  Calendar,
  ArrowLeft,
} from "lucide-react";
import Link from "next/link";
import type { Database } from "@/types/database.types";

type FeedbackRow = Database["public"]["Tables"]["feedback"]["Row"];
type FeedbackType = FeedbackRow["type"];
type FeedbackStatus = FeedbackRow["status"];

const typeConfig: Record<
  FeedbackRow["type"],
  { label: string; icon: typeof Bug; className: string }
> = {
  BUG_REPORT: { label: "Bug Report", icon: Bug, className: "text-destructive" },
  FEATURE_REQUEST: {
    label: "Feature Request",
    icon: Lightbulb,
    className: "text-status-pending",
  },
  GENERAL: { label: "General", icon: MessageSquare, className: "text-primary" },
};

const statusConfig: Record<FeedbackStatus, { label: string; className: string }> = {
  OPEN: {
    label: "Open",
    className: "bg-status-pending/10 text-status-pending border-status-pending/20",
  },
  ACKNOWLEDGED: {
    label: "Acknowledged",
    className: "bg-status-approved/10 text-status-approved border-status-approved/20",
  },
  CLOSED: {
    label: "Closed",
    className: "bg-status-resolved/10 text-status-resolved border-status-resolved/20",
  },
};

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function MyFeedbackDetailPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?redirect=/my-feedback");

  const { data: feedback } = await supabase
    .from("feedback")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  const fb = feedback as FeedbackRow | null;
  if (!fb) {
    notFound();
  }

  const typeInfo = typeConfig[fb.type];
  const statusInfo = statusConfig[fb.status];
  const TypeIcon = typeInfo.icon;

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
      <Link
        href="/my-feedback"
        className="mb-6 inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Back to My Feedback
      </Link>

      <div className="rounded-lg border border-border bg-card p-6">
        <div className="mb-4 flex items-start gap-4">
          <div className="flex size-10 items-center justify-center rounded-lg bg-muted">
            <TypeIcon className={`size-5 ${typeInfo.className}`} />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center rounded-md bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                {typeInfo.label}
              </span>
              <span
                className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium ${statusInfo.className}`}
              >
                {statusInfo.label}
              </span>
            </div>
            <h1 className="mt-2 text-xl font-bold text-foreground">
              {fb.title}
            </h1>
          </div>
        </div>

        <div className="mb-6 flex items-center gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Calendar className="size-3.5" />
            {formatReportDate(fb.created_at)}
          </span>
          {fb.rating && (
            <span className="flex items-center gap-1 text-status-pending">
              <Star className="size-3.5 fill-status-pending" />
              {fb.rating}/5
            </span>
          )}
        </div>

        <div className="mb-6 rounded-lg bg-muted/50 p-4">
          <p className="text-sm leading-relaxed text-foreground whitespace-pre-wrap">
            {fb.description}
          </p>
        </div>

        {fb.photo_urls && fb.photo_urls.length > 0 && (
          <div className="mb-6">
            <PhotoGallery urls={fb.photo_urls} />
          </div>
        )}

        {fb.admin_note && (
          <div className="rounded-lg border border-border bg-muted/30 p-4">
            <p className="text-xs font-medium text-muted-foreground">
              Admin note
            </p>
            <p className="mt-1 text-sm text-foreground">
              {fb.admin_note}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
