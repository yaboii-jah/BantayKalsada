import { openDB } from "idb";
import type { CreateReportInput } from "@/lib/validations/report";

export type DraftStatus = "draft" | "queued" | "submitting" | "submitted" | "failed";

export interface PhotoBlob {
  id: string;
  blob: Blob;
  name: string;
}

export interface OfflineDraft {
  id: string;
  formData: Omit<CreateReportInput, "photo_urls">;
  photos: PhotoBlob[];
  status: DraftStatus;
  createdAt: string;
  submittedAt?: string;
  error?: string;
  reportId?: string;
}

const DB_NAME = "bantay-kalsada-offline";
const DB_VERSION = 1;

function openDb() {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains("drafts")) {
        db.createObjectStore("drafts", { keyPath: "id" });
      }
    },
  });
}

export async function saveDraft(draft: OfflineDraft): Promise<void> {
  const db = await openDb();
  await db.put("drafts", draft);
}

export async function getDraft(id: string): Promise<OfflineDraft | undefined> {
  const db = await openDb();
  return db.get("drafts", id);
}

export async function getAllDrafts(): Promise<OfflineDraft[]> {
  const db = await openDb();
  return db.getAll("drafts");
}

export async function getDraftsByStatus(...statuses: DraftStatus[]): Promise<OfflineDraft[]> {
  const db = await openDb();
  const all = await db.getAll("drafts");
  return all.filter((d) => statuses.includes(d.status));
}

export async function updateDraftStatus(
  id: string,
  status: DraftStatus,
  extra?: Partial<Pick<OfflineDraft, "error" | "reportId" | "submittedAt">>,
): Promise<void> {
  const db = await openDb();
  const draft = await db.get("drafts", id);
  if (!draft) return;
  await db.put("drafts", { ...draft, status, ...extra });
}

export async function deleteDraft(id: string): Promise<void> {
  const db = await openDb();
  await db.delete("drafts", id);
}

export async function clearSubmittedDrafts(): Promise<void> {
  const db = await openDb();
  const all = await db.getAll("drafts");
  const ids = all.filter((d) => d.status === "submitted").map((d) => d.id);
  const tx = db.transaction("drafts", "readwrite");
  await Promise.all(ids.map((id) => tx.store.delete(id)));
  await tx.done;
}

export async function getDraftCount(): Promise<number> {
  const db = await openDb();
  const all = await db.getAll("drafts");
  return all.filter((d) => d.status !== "submitted").length;
}

export async function getQueuedCount(): Promise<number> {
  const db = await openDb();
  const all = await db.getAll("drafts");
  return all.filter((d) => d.status === "queued" || d.status === "submitting").length;
}