import Link from "next/link";
import { Button } from "@/components/ui/button";
import { FileQuestion, ArrowLeft } from "lucide-react";

export default function MyReportNotFound() {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center justify-center px-4 py-24 text-center">
      <div className="mb-6 inline-flex size-16 items-center justify-center rounded-2xl bg-muted">
        <FileQuestion className="size-8 text-muted-foreground" />
      </div>
      <h2 className="text-lg font-semibold text-foreground">
        Report not found
      </h2>
      <p className="mt-2 text-sm text-muted-foreground">
        This report doesn&apos;t exist or you don&apos;t have permission to
        view it.
      </p>
      <Link href="/my-reports" className="mt-6">
        <Button variant="outline">
          <ArrowLeft className="mr-1 size-4" />
          Back to my reports
        </Button>
      </Link>
    </div>
  );
}
