# Offline Report Submission

## Design

- **Genre:** Utility / Progressive Enhancement. Lets a citizen on a flaky or absent
  connection complete a full report on `/submit` (fields, severity, barangay, photos from
  camera/gallery, map pin) and submit it. The report is persisted locally in IndexedDB and
  replayed through the normal `submitReport` Server Action when connectivity returns.
- **Architecture:** No server-side changes. `submitReport` remains the only write path — it
  still enforces auth, verified email, 5/24h rate limit, `is_within_boundary` RPC, Zod, and
  the DB boundary trigger at submit time. Offline is a client-only concern: a draft store
  (IndexedDB), a shared submit helper, an offline-aware photo widget, a reconnect processor,
  and a management panel.
- **No schema change, no migration, no new dependencies.** `File` objects are
  structured-cloneable, so photo blobs store directly in IndexedDB.
- **Scope: new report submissions only.** Report edits, feedback, and comments remain
  online-only.

### Design Decisions

- **IndexedDB over localStorage** — photos can be up to 10 MB each (1–3 per report);
  localStorage (~5 MB) cannot hold them, and base64 conversion blocks the main thread.
  IndexedDB handles binary blobs natively. Hand-rolled wrapper (`lib/offline-queue.ts`) —
  no `idb` dependency.
- **User-scoped drafts** — each draft records the `userId` at queue time. The processor
  only submits drafts matching the *current* session user, so a different person logging in
  on a shared device cannot trigger someone else's report.
- **Server Action as the only write path** — `submitQueuedReport` uploads pending `File`s
  to Cloudinary, assembles a normal `CreateReportInput`, and calls `submitReport`. No
  rate-limit or boundary logic is duplicated client-side.
- **Photo upload deferred, not skipped** — `PhotoUpload` becomes offline-aware: files
  selected while offline are held locally (preview shown, "Saved locally" chip, no
  failed-upload error) and reported to the form via `onChange(urls, pendingFiles)`. When
  connectivity returns while the form is still open, pending files auto-upload and flip to
  Cloudinary URLs.
- **Trigger points** — (a) offline submit: `report-form.tsx` branches on `!navigator.onLine`
  and queues directly; (b) flaky connection: the online `submitReport` await is wrapped in
  try/catch — a network `TypeError` falls back to queueing instead of leaving the submit
  spinner stuck (previously an unhandled rejection). Already-uploaded Cloudinary URLs in
  `photo_urls` are stored alongside pending files, so they are never re-uploaded.
- **No offline redirect** — after queueing, the form resets in place and shows a
  confirmation banner. `router.push("/my-reports")` is avoided because RSC-payload
  navigation over a dead connection is unreliable.
- **Auto-submit on reconnect with manual fallback** — `OfflineQueueProcessor` (mounted in
  `(citizen)/layout.tsx`) drains the queue on mount, the `online` event, and
  `visibilitychange`. Failed attempts keep the draft with `lastError`; a "Saved offline
  reports" panel on `/my-reports` lists drafts with Retry / Discard. No silent data loss.
- **Cross-tab safety** — `navigator.locks.request("bantay-kalsada-offline-queue")`
  (best-effort; falls back gracefully when unsupported) plus an in-process `processingRef`
  prevents double submission.
- **Offline map behavior** — map tiles are network-only (SW config), so the pin canvas is
  blank offline, but tap-to-pin and "Use My Location" (geolocation needs no network) still
  work; reverse geocoding fails silently so `location_label` stays unset. `TaytayBoundary`
  renders from bundled data.
- **Edit mode is not queued** — the offline branch in `report-form.tsx` bails out when
  `isEdit` is true (editing an existing PENDING report requires a connection).

## User Flows

### Flow 1 — Complete and submit a report while offline

```
Citizen on /submit with no connection
  → fills category/title/description/severity/barangay
  → adds photos → PhotoUpload sees navigator.onLine === false
       → photos preview locally, marked "Saved locally", reported as pendingFiles
  → pins location (blank tile canvas, pin works)
  → taps Submit
    report-form handleRawSubmit: !navigator.onLine → isEdit? (never here) →
      validate via createReportSchema.omit({ photo_urls: true })
      + manual photo count (urls + files must be 1–3)
      → addQueuedReport({ userId, ...fields, photoUrls, photoFiles })
      → toast "saved, will submit when back online" + confirmation banner → form resets
```

### Flow 2 — Reconnect → auto-submit

```
OfflineQueueProcessor (in citizen layout)
  → mount / online event / visibilitychange → getQueuedReports()
  → current session user ≠ draft.userId → skip (stays queued)
  → submitQueuedReport(draft):
      upload each photoFile → Cloudinary (via /api/uploads/sign)
      photo_urls = [...photoUrls, ...newUrls]
      submitReport(null, payload)   ← all server guards run here
  → success: removeQueuedReport(id) + toast "…submitted successfully!"
  → failure: updateQueuedReport(id, { lastError }) + toast with reason
```

### Flow 3 — Manual retry / discard

```
/my-reports → OfflineReportsPanel (reads drafts for the current user)
  → each draft shows title, queued date, photo count, status chip
  → Retry → submitQueuedReport (same helper) → on success router.refresh() so the new report appears
  → Discard → removeQueuedReport(id)
  → failed drafts show lastError (rate limit, session expired, boundary, etc.) under the row
```

### Flow 4 — Flaky connection during an online submit

```
Submit while navigator.onLine === true but the network drops mid-call
  → submitReport rejects with TypeError (fetch) → caught in onSubmit
  → queueOfflineReport(data) — photo_urls already real Cloudinary URLs, pendingFiles empty
  → toast + confirmation banner → form resets (same end state as Flow 1)
```

## States

| State | Behavior |
|-------|----------|
| **Offline banner** | Top of `/submit` (new-report mode only): "You're offline — your report will be saved on this device and submitted automatically when you're back online." |
| **Queued confirmation** | Green banner after queueing: report saved offline; track under "Saved offline reports" on My Reports. |
| **Photo while offline** | Thumbnail preview with "Saved locally" chip (CloudOff icon), no upload spinner/error. Helper text explains photos upload when back online. |
| **Reconnect while form open** | Pending photos auto-upload (spinner then flip to normal). |
| **Submit while pending photos remain (online)** | Blocked with "Photos are still being saved on this device — please wait" toast. |
| **Edit mode offline** | Error: "Connect to the internet to edit your report." Never queued. |
| **Auto-submit success** | Draft removed + success toast. |
| **Auto-submit failure** | Draft kept with `lastError` + error toast; visible on the /my-reports panel. |
| **Queue processing** | `processingRef` + `navigator.locks` prevent double submits (same tab + cross-tab). |

## Files Created

| File | Purpose |
|------|---------|
| `lib/cloudinary-upload.ts` | `uploadToCloudinary(file)` extracted from `photo-upload.tsx` (shared by widget + processor) |
| `lib/offline-queue.ts` | IndexedDB wrapper: `addQueuedReport`, `getQueuedReports`, `getQueuedReportsForUser`, `updateQueuedReport`, `removeQueuedReport` |
| `lib/offline-submit.ts` | `submitQueuedReport(draft)` — uploads pending files, builds payload, calls `submitReport` |
| `components/offline/offline-queue-processor.tsx` | Drains the queue on mount / `online` / `visibilitychange` |
| `components/offline/offline-reports-panel.tsx` | "Saved offline reports" card on `/my-reports` with Retry / Discard |
| `context/feature-specs/29-offline-submission.md` | This spec |

## Files Modified

| File | Change |
|------|--------|
| `components/reports/photo-upload.tsx` | Offline-aware; reports `(urls, pendingFiles)`; auto-uploads pending files on reconnect |
| `components/reports/report-form.tsx` | Raw submit handler branches offline/online; try/catch fallback to queue; offline + queued banners; reset via `resetKey` |
| `app/(citizen)/layout.tsx` | Mounts `<OfflineQueueProcessor />` |
| `app/(citizen)/my-reports/page.tsx` | Renders `<OfflineReportsPanel />` above the grid |
| `context/project-overview.md` | Offline submission → In Scope |
| `context/architecture.md` | Citizen boundary + storage note |
| `context/app-codebase-context.md` | Offline data flow documented |
| `context/progress-tracker.md` | Mark complete |

## Implementation Status

| Item | Status |
|------|--------|
| `lib/cloudinary-upload.ts` — extracted upload helper | ✅ |
| `lib/offline-queue.ts` — IndexedDB draft store | ✅ |
| `lib/offline-submit.ts` — shared submit helper | ✅ |
| `components/reports/photo-upload.tsx` — offline-aware | ✅ |
| `components/reports/report-form.tsx` — offline branch + try/catch + banners | ✅ |
| `components/offline/offline-queue-processor.tsx` | ✅ |
| `components/offline/offline-reports-panel.tsx` | ✅ |
| Wired into `(citizen)/layout.tsx` and `/my-reports` | ✅ |
| `npm run build` passes with zero errors | ✅ |
| ESLint zero errors on touched files | ✅ |
| Docs (spec, project-overview, architecture, app-codebase-context, progress-tracker) | ✅ |

### Offline Experience v2.3 — draft editing + offline map

| Item | Status |
|------|--------|
| `lib/taytay-boundary.ts` — polygon + `isPointInTaytay`, single source of truth | ✅ |
| `components/maps/taytay-boundary.tsx` — re-imports polygon | ✅ |
| `lib/offline-queue.ts` — `overwriteQueuedReport(id, updated)` full replace | ✅ |
| `components/reports/photo-upload.tsx` — `initialUrls`/`initialFiles` draft seeds | ✅ |
| `components/reports/report-form.tsx` — `draftId`/`draftMeta`/`draftInitialPhotoFiles`; `isDraft` "Save draft only" | ✅ |
| `components/offline/offline-reports-panel.tsx` — Edit link per draft | ✅ |
| `app/(citizen)/offline-edit/[draftId]/page.tsx` — client draft-edit route | ✅ |
| `components/offline/taytay-tiles-preloader.tsx` — warm zoom 15–16 OSM tiles into SW cache | ✅ |
| Boundary gate (offline + draft submit) rejects pins outside Taytay | ✅ |

## Check When Done

- [x] Offline: full form fills, photos preview locally, submit queues to IndexedDB
- [x] Reconnect: queued drafts auto-submit through the existing `submitReport` action
- [x] Failed auto-submit keeps the draft with `lastError` (no silent loss)
- [x] `/my-reports` panel lists drafts with Retry / Discard
- [x] Drafts are user-scoped; processor skips mismatched sessions
- [x] Flaky online submit falls back to the queue instead of a stuck spinner
- [x] Edit mode never queues; feedback/comments untouched
- [x] No server, schema, or dependency changes
- [x] `npm run build` passes with zero errors

## Known Limitations

- No Background Sync SW `sync` event — the queue drains on page load, `online`, and
  `visibilitychange`, so the tab must be open to auto-submit.
- Map tiles load offline only if pre-warmed by `taytay-tiles-preloader` (zoom 15–16
  around Taytay center) while online; unvisited areas still show a blank canvas, but
  the boundary polygon + `isPointInTaytay` gate still apply.
- Queue is browser-local — clearing site data loses pending drafts.
