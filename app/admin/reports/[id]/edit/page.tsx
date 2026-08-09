import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/service-role";
import { AdminReportEditForm } from "@/components/admin/admin-report-edit-form";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export default async function AdminReportEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
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

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
      <Link href={`/admin/reports/${id}`}>
        <Button variant="ghost" size="sm" className="mb-6 -ml-2">
          <ArrowLeft className="mr-1 size-4" />
          Back to report
        </Button>
      </Link>

      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-foreground sm:text-3xl">
          Edit Report
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Update the report details. The submitter will be notified of the
          change.
        </p>
      </div>

      <AdminReportEditForm
        reportId={report.id}
        defaultValues={{
          title: report.title,
          description: report.description,
          category: report.category,
          barangay: report.barangay ?? "DOLORES",
          severity: report.severity,
          photo_urls: report.photo_urls,
          latitude: report.latitude,
          longitude: report.longitude,
          location_label: report.location_label ?? undefined,
        }}
      />
    </div>
  );
}
