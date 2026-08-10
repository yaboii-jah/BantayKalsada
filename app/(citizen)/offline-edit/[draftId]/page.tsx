"use client";

import { useEffect, useState } from "react";
import { notFound, useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2 } from "lucide-react";
import { ReportForm } from "@/components/reports/report-form";
import { getQueuedReports, type QueuedReport } from "@/lib/offline-queue";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

export default function OfflineEditPage() {
  const params = useParams<{ draftId: string }>();
  const draftId = params.draftId;
  const [draft, setDraft] = useState<QueuedReport | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const supabase = createSupabaseBrowserClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (cancelled || !user) {
        if (!cancelled) setLoading(false);
        return;
      }
      const all = await getQueuedReports();
      if (cancelled) return;
      const found = all.find((r) => r.id === draftId && r.userId === user.id);
      setDraft(found ?? null);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [draftId]);

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!draft) {
    notFound();
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
      <Button variant="ghost" size="sm" className="mb-6 -ml-2" asChild>
        <Link href="/my-reports">
          <ArrowLeft className="mr-1 size-4" />
          Back to My Reports
        </Link>
      </Button>

      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-foreground sm:text-3xl">
          Edit Offline Report
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Update the details of your saved draft. Changes are kept on this
          device until the report is submitted when you&apos;re online.
        </p>
      </div>

      <ReportForm
        draftId={draft.id}
        draftMeta={{ userId: draft.userId, queuedAt: draft.queuedAt }}
        defaultValues={{
          title: draft.title,
          description: draft.description,
          category: draft.category,
          barangay: draft.barangay,
          severity: draft.severity,
          photo_urls: draft.photoUrls,
          latitude: draft.latitude,
          longitude: draft.longitude,
          location_label: draft.location_label ?? undefined,
        }}
        draftInitialPhotoFiles={draft.photoFiles}
      />
    </div>
  );
}