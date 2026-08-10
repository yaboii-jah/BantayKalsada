import Link from "next/link";
import { Button } from "@/components/ui/button";
import { FileQuestion } from "lucide-react";

export default function AdminReportNotFound() {
  return (
    <div className="flex flex-col items-center gap-4 py-16 text-center">
      <FileQuestion className="h-12 w-12 text-muted-foreground" />
      <div>
        <p className="text-lg font-medium text-foreground">
          Report not found
        </p>
        <p className="text-sm text-muted-foreground">
          This report may have been deleted or the link is incorrect.
        </p>
      </div>
      <Button className="mt-6" asChild>
        <Link href="/admin/pending">Back to pending queue</Link>
      </Button>
    </div>
  );
}
