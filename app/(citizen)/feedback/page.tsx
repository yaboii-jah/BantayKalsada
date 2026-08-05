import { FeedbackForm } from "@/components/reports/feedback-form";
import { BackButton } from "@/components/back-button";

export default function FeedbackPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6 lg:px-8">
      <BackButton fallbackHref="/browse" />
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">Submit Feedback</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Help us improve Bantay Kalsada. Report a bug, suggest a feature, or
          share your thoughts.
        </p>
      </div>
      <FeedbackForm />
    </div>
  );
}
