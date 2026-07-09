import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/service-role";
import { FeedbackActions } from "@/components/admin/feedback-actions";
import { FeedbackNoteEditor } from "@/components/admin/feedback-note-editor";
import { formatReportDate } from "@/lib/date-utils";
import { PhotoGallery } from "@/components/browse/photo-gallery";
import {
  Star,
  Bug,
  Lightbulb,
  MessageSquare,
  Calendar,
  User,
  ArrowLeft,
} from "lucide-react";
import Link from "next/link";
import type { Database } from "@/types/database.types";

type FeedbackRow = Database["public"]["Tables"]["feedback"]["Row"];

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

const statusConfig: Record<
  FeedbackRow["status"],
  { label: string; className: string }
> = {
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

export default async function AdminFeedbackReviewPage({ params }: PageProps) {
  const { id } = await params;
  const adminClient = createAdminClient();

  const { data: feedback } = await adminClient
    .from("feedback")
    .select("*")
    .eq("id", id)
    .single();

  if (!feedback) {
    notFound();
  }

  const { data: submitter } = await adminClient
    .from("profiles")
    .select("full_name, email")
    .eq("id", feedback.user_id)
    .single();

  const typeInfo = typeConfig[feedback.type];
  const statusInfo = statusConfig[feedback.status];
  const TypeIcon = typeInfo.icon;

  return (
    <div className="mx-auto max-w-4xl">
      <Link
        href="/admin/feedback"
        className="mb-6 inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Back to Feedback Inbox
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
              {feedback.title}
            </h1>
          </div>
        </div>

        <div className="mb-6 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Calendar className="size-3.5" />
            {formatReportDate(feedback.created_at)}
          </span>
          {submitter && (
            <span className="flex items-center gap-1">
              <User className="size-3.5" />
              {submitter.full_name} ({submitter.email})
            </span>
          )}
          {feedback.rating && (
            <span className="flex items-center gap-1 text-status-pending">
              <Star className="size-3.5 fill-status-pending" />
              {feedback.rating}/5
            </span>
          )}
        </div>

        <div className="mb-6 rounded-lg bg-muted/50 p-4">
          <p className="text-sm leading-relaxed text-foreground whitespace-pre-wrap">
            {feedback.description}
          </p>
        </div>

        {feedback.photo_urls && feedback.photo_urls.length > 0 && (
          <div className="mb-6">
            <PhotoGallery urls={feedback.photo_urls} />
          </div>
        )}

        <div className="mb-6">
          <FeedbackNoteEditor
            feedbackId={feedback.id}
            initialNote={feedback.admin_note}
          />
        </div>
      </div>

      <FeedbackActions feedbackId={feedback.id} status={feedback.status} />
    </div>
  );
}
