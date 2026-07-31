import { notFound, redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ReportForm } from "@/components/reports/report-form";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default async function EditReportPage({
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

  if (report.status !== "PENDING") {
    redirect(`/my-reports/${id}`);
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
      <Link href={`/my-reports/${id}`}>
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
          Update the details of your pending report below.
        </p>
      </div>

      <ReportForm
        reportId={id}
        defaultValues={{
          title: report.title,
          description: report.description,
          category: report.category,
          barangay: report.barangay,
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
