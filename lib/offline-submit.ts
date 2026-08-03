import { uploadToCloudinary } from "@/lib/cloudinary-upload";
import { submitReport } from "@/app/actions";
import type { QueuedReport } from "@/lib/offline-queue";
import type { CreateReportInput } from "@/lib/validations/report";

export async function submitQueuedReport(
  report: QueuedReport,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const uploadedUrls: string[] = [];
    for (const file of report.photoFiles) {
      const url = await uploadToCloudinary(file);
      uploadedUrls.push(url);
    }

    const payload: CreateReportInput = {
      title: report.title,
      description: report.description,
      category: report.category,
      barangay: report.barangay,
      severity: report.severity,
      photo_urls: [...report.photoUrls, ...uploadedUrls],
      latitude: report.latitude,
      longitude: report.longitude,
      location_label: report.location_label,
    };

    const result = await submitReport(null, payload);
    if (result.success) {
      return { ok: true };
    }
    return { ok: false, error: result.error ?? "Failed to submit report" };
  } catch (err) {
    if (err instanceof TypeError || (err instanceof Error && /fetch|network|load failed/i.test(err.message))) {
      return {
        ok: false,
        error: "You're offline — this report will auto-submit when you're back online.",
      };
    }
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Failed to submit report",
    };
  }
}
