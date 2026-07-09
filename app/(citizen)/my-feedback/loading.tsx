import { ReportsGridSkeleton } from "@/components/reports/reports-grid-skeleton";

export default function MyFeedbackLoading() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <ReportsGridSkeleton count={6} />
    </div>
  );
}
