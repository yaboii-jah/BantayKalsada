# Observability (Tier 5) — Sentry Errors + Plausible Analytics

## Design

- **Genre:** Utility / Operations. Adds production error monitoring and privacy-friendly
  analytics ahead of marketing, so issues and traffic can be seen *before* promotion starts.
- **Two independent systems:**
  - **Sentry — error monitoring only.** No tracing, no session replay, no logs. Stays inside
    the free tier (~5,000 errors/month) and avoids any performance/telemetry overhead beyond
    error capture. Covers the Node server runtime, the edge runtime (`proxy.ts`, edge
    route handlers), and the browser.
  - **Plausible — first-party analytics.** Cookie-less, no consent banner required, privacy
    friendly. Page views + custom events surface real usage and funnel behavior.
- **Env-guarded everywhere.** Neither system can crash the app. When `NEXT_PUBLIC_SENTRY_DSN`
  is unset, all Sentry configs no-op and `global-error.tsx` renders without calling Sentry.
  When `NEXT_PUBLIC_PLAUSIBLE_SRC` is unset, the Plausible provider is not rendered and
  `lib/analytics.ts` events are inert no-ops via the SDK's own fallback. Build, typecheck,
  and runtime are all verified with these variables absent.

### Design Decisions

- **`@sentry/nextjs` (v10) with the Next 16 conventions.** Root-level `instrumentation.ts`
  (registered automatically by Next at runtime — the `register()` hook) and
  `instrumentation-client.ts` (client bundle), the latter is webpack-injected by the
  `withSentryConfig` plugin. Errors are funneled through `onRequestError`, the
  App-Router-native hook for both the root Error Boundary and router errors:
  `export const onRequestError = Sentry.captureRequestError;`.
- **`withSentryConfig` wraps the existing `withSerwist` config.** Composition is
  `withSentryConfig(withSerwist({...})(nextConfig), {...})`, which keeps the serwist service
  worker plugin working while adding the Sentry webpack plugin (client config injection +
  `instrumentation-client.ts` injection). Options: `org`/`project`/`authToken` from env,
  `silent: true`, `suppressOnRouterTransitionStartWarning: true`, and webpack treeshaking
  that strips the debug logging/tracing SDK code from the shipped bundle.
- **No tunnel, no `proxy.ts` changes.** Sentry ingest stays external (no `$SENTRY_RELEASE`
  tunnel path), so the existing `proxy.ts` matcher is untouched.
- **DSN-guarded autoloading.** `NEXT_PUBLIC_SENTRY_DSN` is read as the Sentry DSN in the
  server, edge, and client configs. `if (dsn)` prevents any heartbeat/perf sample. Source-map
  upload is separate — driven by `SENTRY_ORG`, `SENTRY_PROJECT`, `SENTRY_AUTH_TOKEN`
  (build-time only) and skipped cleanly when absent.
- **`global-error.tsx` is a last-resort client boundary.** Next renders it only when the
  root layout itself fails, so it cannot assume the app's layout — it carries its own
  `<html className="dark h-full antialiased"><body>` and a centered destructive state styled
  with tailwind tokens (matching `browse/error.tsx`). `Sentry.captureException` is called in
  a `useEffect` guarded by a DSN env check.
- **Plausible via `next-plausible`.** `PlausibleProvider` wraps the app in `app/layout.tsx`
  (a server component) and is rendered only when `NEXT_PUBLIC_PLAUSIBLE_SRC` is set (the
  provider throws if given a falsy `src`, hence the guard). `lib/analytics.ts` centralizes a
  typed event map (`AnalyticsEvents`) and a `useAnalytics()` hook — every client component
  calls `track("Event", { props: {...} })`. No PII, no coordinates, no report content in any
  event — only dimensions (severity, category, flagType, feedback type).
- **Events stay user-initiated.** Custom events fire from real interactions: report
  submitted/queued offline/offline-submitted, share click, flag click, comment added,
  feedback submitted, signup, login, and admin approve/reject/resolve. No auto-tracked
  scroll/navigation noise beyond Plausible's built-in pageview tracking.

## User Flows

### Flow 1 — ROI: what observability delivers

```
DevOps (post-deploy)
  → Sentry Dashboard: unhandled client/server errors with stack traces + affected users
  → Plausible Dashboard: page views (which pages), referrers, custom event counts
  → (e.g.) sees "Report Queued Offline" spikes + "Failed to fetch" errors → targets
         offline submit reliability instead of guessing
```

### Flow 2 — Error capture, three surfaces

```
Node server + edge (proxy/routes)
  instrumentation.ts register() picks config by NEXT_RUNTIME (nodejs → sentry.server.config
    edge → sentry.edge.config)
  unhandled errors in route handlers/server components/server actions → onRequestError
    → Sentry.captureRequestError → sent to DSN (when set)

Browser
  withSentryConfig injects instrumentation-client.ts → client SDK init (DSN-guarded)
  errors in "use client" code → captured by SDK
  Root layout failure (very rare) → global-error.tsx → Sentry.captureException
```

### Flow 3 — Analytics on a report action

```
Citizen submits a report (report-form.tsx)
  → handleSubmit → submitReport success → track("Report Submitted",
       { props: { severity, category } })
  → (offline path) queueOfflineReport → track("Report Queued Offline")

OfflineQueueProcessor auto-submits a queued draft
  → success → track("Offline Report Submitted")

Admin approves/rejects/resolves (action-buttons.tsx)
  → track("Report Approved" | "Report Rejected" | "Report Resolved")

Signup / Login (register + login pages)
  → track("Signup") / track("Login")
```

## States

| State | Behavior |
|-------|----------|
| **No env vars** | All Sentry configs no-op; provider not rendered; events inert. App fully functional. Verified: `tsc`/lint/build all pass. |
| **DSN set, no auth token** | Errors captured to Sentry; source maps not uploaded (warning only, build still green). |
| **DSN + org/project/authToken set** | Errors captured + source maps uploaded at build (readable stack traces). |
| **`NEXT_PUBLIC_PLAUSIBLE_SRC` set** | Provider mounted; pageviews + custom events tracked to the Plausible site. |
| **Error in `global-error.tsx`** | Renders standalone dark page (own html/body) + logs to Sentry. |

## Files Created

| File | Purpose |
|------|---------|
| `sentry.server.config.ts` | Node SDK init (`Sentry.init`) for server runtimes — DSN-guarded |
| `sentry.edge.config.ts` | Edge SDK init for edge runtime/`proxy.ts` — DSN-guarded |
| `instrumentation.ts` | `register()` imports the right config by runtime; `onRequestError = Sentry.captureRequestError` |
| `instrumentation-client.ts` | Client SDK init (picked up + injected by `withSentryConfig`) — DSN-guarded |
| `app/global-error.tsx` | Last-resort root error boundary (its own html/body) → `Sentry.captureException` |
| `lib/analytics.ts` | `AnalyticsEvents` map + `useAnalytics()` hook over `next-plausible`'s `usePlausible` |
| `context/feature-specs/31-observability.md` | This spec |

## Files Modified

| File | Change |
|------|--------|
| `next.config.ts` | Wrapped with `withSentryConfig` (org/project/authToken from env, `silent`, suppress-onRouterTransition-start warning, webpack treeshake removeTracing/removeDebugLogging) |
| `app/layout.tsx` | Renders `<PlausibleProvider>` when `NEXT_PUBLIC_PLAUSIBLE_SRC` is set |
| `.env.example` | Sentry + Plausible env var blocks |
| `components/reports/report-form.tsx` | `track("Report Submitted", {...})` + `track("Report Queued Offline")`; deps updated |
| `components/offline/offline-queue-processor.tsx` | `track("Offline Report Submitted")` on successful queued submit |
| `components/reports/share-button.tsx` | `track("Report Shared")` |
| `components/reports/flag-report-buttons.tsx` | `track("Report Flagged", { flagType })` |
| `components/reports/comment-form.tsx` | `track("Comment Added")` |
| `components/reports/feedback-form.tsx` | `track("Feedback Submitted", { type })` |
| `app/(auth)/register/page.tsx` | `track("Signup")` |
| `app/(auth)/login/page.tsx` | `track("Login")` |
| `components/admin/action-buttons.tsx` | `track("Report Approved"/"Report Rejected"/"Report Resolved")` across the three action components |
| `context/project-overview.md` | Observability → In Scope |
| `context/architecture.md` | Stack rows, boundaries, invariants 27–28 |
| `context/app-codebase-context.md` | Intro + File Organization |
| `context/progress-tracker.md` | Completed section |

## Implementation Status

| Item | Status |
|------|--------|
| `@sentry/nextjs` + `next-plausible` installed | ✅ |
| `sentry.server.config.ts` / `sentry.edge.config.ts` / `instrumentation-client.ts` (DSN-guarded `Sentry.init`) | ✅ |
| `instrumentation.ts` — runtime-aware `register()` + `onRequestError = Sentry.captureRequestError` | ✅ |
| `app/global-error.tsx` — standalone dark root boundary + DSN-guarded `captureException` | ✅ |
| `next.config.ts` — `withSentryConfig` wrapping `withSerwist` | ✅ |
| `lib/analytics.ts` — typed events + `useAnalytics()` | ✅ |
| `app/layout.tsx` — guarded PlausibleProvider | ✅ |
| Events wired: report form, offline processor, share, flag, comment, feedback, signup, login, admin approve/reject/resolve | ✅ |
| `.env.example` updated | ✅ |
| `npx tsc --noEmit` clean | ✅ |
| `npm run lint` clean (all touched files; one exhaustive-deps dep added) | ✅ |
| `npm run build` passes (webpack, 31 routes, serwist SW bundled, proxy present) | ✅ |
| Docs (spec, project-overview, architecture, app-codebase-context, progress-tracker) | ✅ |

## Check When Done

- [x] Sentry captures server + edge + client errors when DSN is set; no-op in dev/absent-env builds
- [x] `global-error.tsx` exists (removes the manual-setup warning; standalone in dark)
- [x] Plausible provider + typed events; pageviews + 13 custom events
- [x] No tunnel → `proxy.ts` unchanged
- [x] All env vars documented in `.env.example` (`.env.local` gitignored)
- [x] `tsc` / `lint` / `build` all pass with env vars absent
- [x] Context updated

## Known Limitations

- **Live verification pending real credentials.** The user must create the Sentry project
  (copy `NEXT_PUBLIC_SENTRY_DSN`; optionally `SENTRY_ORG`/`SENTRY_PROJECT`/`SENTRY_AUTH_TOKEN`
  for source maps) and the Plausible site (get the `NEXT_PUBLIC_PLAUSIBLE_SRC` script URL
  for the deployed origin), put them in the Vercel project env, and redeploy.
- **Errors only, by design.** Tracing and session replay are intentionally not enabled to stay
  in the free tier and keep payloads minimal. If sampled tracing is ever needed, set
  `tracesSampleRate` and drop the `removeTracing` treeshake option.
- **Plausible page-view attribution** counts visits to the deployed origin only, matching the
  `src` domain registered in the Plausible dashboard.
- **Edge and client SDKs** capture edge/proxy and browser errors respectively; only the Node
  runtime gets the `onRequestError` funnel (plus the client `global-error` boundary).