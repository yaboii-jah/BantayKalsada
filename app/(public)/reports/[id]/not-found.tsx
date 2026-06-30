import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Map, ArrowLeft } from "lucide-react";

export default function ReportNotFound() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-24 sm:px-6 lg:px-8">
      <div className="flex flex-col items-center text-center">
        <div className="mb-6 inline-flex size-16 items-center justify-center rounded-2xl bg-muted">
          <Map className="size-8 text-muted-foreground" />
        </div>
        <h1 className="text-xl font-semibold text-foreground">
          Report not found
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          This report does not exist or has been removed. It may not be publicly
          visible yet.
        </p>
        <Link href="/browse" className="mt-6">
          <Button variant="outline">
            <ArrowLeft className="mr-2 size-4" />
            Back to browse
          </Button>
        </Link>
      </div>
    </div>
  );
}
