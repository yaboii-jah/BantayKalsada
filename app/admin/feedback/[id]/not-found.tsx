import Link from "next/link";
import { MessageSquare, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function AdminFeedbackNotFound() {
  return (
    <div className="py-16 text-center">
      <MessageSquare className="mx-auto size-12 text-muted-foreground" />
      <h1 className="mt-4 text-lg font-semibold">Feedback not found</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        This feedback submission does not exist or has been removed.
      </p>
      <Button variant="outline" asChild className="mt-6">
        <Link href="/admin/feedback">
          <ArrowLeft className="mr-2 size-4" />
          Back to Feedback Inbox
        </Link>
      </Button>
    </div>
  );
}
