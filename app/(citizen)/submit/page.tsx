import { ReportForm } from "@/components/reports/report-form";

export default function SubmitPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6 lg:px-8">
      <h1 className="mb-2 text-2xl font-bold tracking-tight text-foreground">
        Submit a Report
      </h1>
      <p className="mb-8 text-sm text-muted-foreground">
        Report a road hazard to help keep your community informed. All reports
        are reviewed by an administrator before being published.
      </p>
      <ReportForm />
    </div>
  );
}
