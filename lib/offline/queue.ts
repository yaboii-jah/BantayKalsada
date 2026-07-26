import {
  getDraftsByStatus,
  updateDraftStatus,
  type OfflineDraft,
} from "./db";
import { submitReport } from "@/app/actions";
import type { CreateReportInput } from "@/lib/validations/report";

export type QueueResult = {
  submitted: number;
  failed: number;
  errors: { id: string; title: string; error: string }[];
};

async function uploadBlobToCloudinary(
  blob: Blob,
  fileName: string,
): Promise<string> {
  const res = await fetch("/api/uploads/sign");
  if (!res.ok) throw new Error("Failed to get upload signature");
  const json = await res.json();
  const config = json.data;

  const file = new File([blob], fileName, { type: blob.type });
  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", config.upload_preset);
  formData.append("api_key", config.api_key);
  formData.append("timestamp", String(config.timestamp));
  formData.append("signature", config.signature);

  const uploadRes = await fetch(
    `https://api.cloudinary.com/v1_1/${config.cloud_name}/image/upload`,
    { method: "POST", body: formData },
  );

  if (!uploadRes.ok) {
    const err = await uploadRes.json().catch(() => null);
    throw new Error(err?.error?.message ?? "Cloudinary upload failed");
  }

  const result = await uploadRes.json();
  return result.secure_url as string;
}

export async function processDraft(draft: OfflineDraft): Promise<void> {
  await updateDraftStatus(draft.id, "submitting");

  try {
    const photoUrls: string[] = [];
    for (const photo of draft.photos) {
      const url = await uploadBlobToCloudinary(photo.blob, photo.name);
      photoUrls.push(url);
    }

    const formData: CreateReportInput = {
      ...draft.formData,
      photo_urls: photoUrls,
    };

    const result = await submitReport(null, formData);

    if (result.success && result.data) {
      await updateDraftStatus(draft.id, "submitted", {
        reportId: result.data.id,
        submittedAt: new Date().toISOString(),
      });
    } else {
      await updateDraftStatus(draft.id, "failed", {
        error: result.error ?? "Submission failed",
      });
    }
  } catch (err) {
    await updateDraftStatus(draft.id, "failed", {
      error: err instanceof Error ? err.message : "Unknown error",
    });
  }
}

export async function processQueue(): Promise<QueueResult> {
  const drafts = await getDraftsByStatus("queued");

  if (drafts.length === 0) {
    return { submitted: 0, failed: 0, errors: [] };
  }

  let submitted = 0;
  let failed = 0;
  const errors: QueueResult["errors"] = [];

  for (const draft of drafts) {
    await processDraft(draft);

    const updated = await getDraftsByStatus("submitted", "failed");
    const latest = updated.find((d) => d.id === draft.id);
    if (latest?.status === "submitted") {
      submitted++;
    } else {
      failed++;
      errors.push({
        id: draft.id,
        title: draft.formData.title,
        error: latest?.error ?? "Unknown error",
      });
    }
  }

  return { submitted, failed, errors };
}