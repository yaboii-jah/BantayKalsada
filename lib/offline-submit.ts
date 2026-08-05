import { uploadToCloudinary } from "@/lib/cloudinary-upload";
import { submitReport } from "@/app/actions";
import type { QueuedReport } from "@/lib/offline-queue";
import type { CreateReportInput } from "@/lib/validations/report";
import { reverseGeocode } from "@/lib/geocode";

export type SubmitQueuedReportResult =
  | { ok: true }
  | { ok: false; error: string; rateLimited?: boolean; retryAfter?: string };

export async function submitQueuedReport(
  report: QueuedReport,
): Promise<SubmitQueuedReportResult> {
  try {
    const uploadedUrls: string[] = [];
    for (const file of report.photoFiles) {
      const url = await uploadToCloudinary(file);
      uploadedUrls.push(url);
    }

    let locationLabel = report.location_label;
    if (!locationLabel) {
      const { displayName } = await reverseGeocode(
        report.latitude,
        report.longitude,
      );
      locationLabel = displayName;
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
      location_label: locationLabel,
    };

    const result = await submitReport(null, payload);
    if (result.success) {
      return { ok: true };
    }
    if (result.retryAfter) {
      return {
        ok: false,
        error: result.error ?? "Failed to submit report",
        rateLimited: true,
        retryAfter: result.retryAfter,
      };
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
