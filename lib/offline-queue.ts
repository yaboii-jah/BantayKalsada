import type { CreateReportInput } from "@/lib/validations/report";

export interface QueuedReport {
  id: string;
  userId: string;
  queuedAt: string;
  title: string;
  description: string;
  category: CreateReportInput["category"];
  barangay: CreateReportInput["barangay"];
  severity: CreateReportInput["severity"];
  latitude: number;
  longitude: number;
  location_label?: string;
  photoUrls: string[];
  photoFiles: File[];
  lastError?: string;
  attemptCount?: number;
  lastAttemptAt?: string;
  rateLimitedUntil?: string;
}

export const MAX_AUTORETRY_ATTEMPTS = 3;
export const AUTORETRY_COOLDOWN_MS = 2 * 60 * 1000;

export function getNextRetryTime(
  attemptCount?: number,
  lastAttemptAt?: string,
): number {
  if (!attemptCount || !lastAttemptAt) return 0;
  return new Date(lastAttemptAt).getTime() + AUTORETRY_COOLDOWN_MS;
}

const DB_NAME = "bantay-kalsada-offline";
const STORE_NAME = "pending-reports";

let dbPromise: Promise<IDBDatabase> | null = null;

function openRaw(version?: number): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = version === undefined ? indexedDB.open(DB_NAME) : indexedDB.open(DB_NAME, version);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Failed to open offline queue"));
  });
}

function openDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;

  dbPromise = (async () => {
    let db = await openRaw();
    if (!db.objectStoreNames.contains(STORE_NAME)) {
      const nextVersion = db.version + 1;
      db.close();
      db = await openRaw(nextVersion);
    }
    db.onversionchange = () => {
      db.close();
      dbPromise = null;
    };
    db.onclose = () => {
      dbPromise = null;
    };
    return db;
  })().catch((error) => {
    dbPromise = null;
    throw error;
  });

  return dbPromise;
}

export async function addQueuedReport(report: QueuedReport): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).put(report);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error("Failed to save offline report"));
    tx.onabort = () => reject(tx.error ?? new Error("Failed to save offline report"));
  });
}

export async function getQueuedReports(): Promise<QueuedReport[]> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const request = tx.objectStore(STORE_NAME).getAll();
    request.onsuccess = () => resolve((request.result as QueuedReport[] | undefined) ?? []);
    tx.onerror = () => reject(tx.error ?? new Error("Failed to read offline queue"));
    tx.onabort = () => reject(tx.error ?? new Error("Failed to read offline queue"));
  });
}

export async function getQueuedReportsForUser(userId: string): Promise<QueuedReport[]> {
  const all = await getQueuedReports();
  return all.filter((report) => report.userId === userId);
}

export async function updateQueuedReport(
  id: string,
  patch: Partial<Pick<QueuedReport, "lastError" | "attemptCount" | "lastAttemptAt" | "rateLimitedUntil">>,
): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const getRequest = store.get(id);
    getRequest.onsuccess = () => {
      const existing = getRequest.result as QueuedReport | undefined;
      if (existing) {
        store.put({ ...existing, ...patch });
      }
    };
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error("Failed to update offline report"));
    tx.onabort = () => reject(tx.error ?? new Error("Failed to update offline report"));
  });
}

export async function overwriteQueuedReport(
  id: string,
  updated: QueuedReport,
): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).put({ ...updated, id });
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error("Failed to update offline report"));
    tx.onabort = () => reject(tx.error ?? new Error("Failed to update offline report"));
  });
}

export async function removeQueuedReport(id: string): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error("Failed to remove offline report"));
    tx.onabort = () => reject(tx.error ?? new Error("Failed to remove offline report"));
  });
}
