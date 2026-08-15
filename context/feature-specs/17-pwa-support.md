# PWA Support

## Design

- **Genre:** Platform enhancement — turns the web app into an installable, offline-capable progressive web application.
- **Architecture:** `@serwist/next` plugin generates and injects a service worker at build time. Manifest file declares app metadata for the browser's install prompt. Client component handles the `beforeinstallprompt` event to show a custom install banner.
- **Offline strategy:** Pages are network-first with cache fallback — previously visited reports are viewable without internet. Static assets (JS, CSS, fonts) are precached at install time. API calls and map tiles are network-only.
- **Icon source:** Generated from existing `public/logo/bantay-kalsada-logo.png`.

### Entry Points

| Entry | Route | Purpose |
|-------|-------|---------|
| Install banner | `(public)` layout | Prompts mobile users to install the app |
| Manifest | `/manifest.json` | Declares app metadata for the browser |
| Service worker | `/sw.js` (generated) | Intercepts requests, serves cached assets |

## Manifest Properties

```json
{
  "name": "Bantay Kalsada",
  "short_name": "Bantay Kalsada",
  "description": "Report road hazards and help keep your community safe.",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#1d4ed8",
  "icons": [
    { "src": "/icon-192x192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icon-512x512.png", "sizes": "512x512", "type": "image/png" }
  ]
}
```

## Caching Strategy

| Resource Type | Strategy | Justification |
|---|---|---|
| JS, CSS, fonts (same-origin) | **Precache** (install time) | Always available instantly, no network needed |
| Navigations (pages) | **Network first, cache fallback** | Fresh content when online; stale page when offline |
| Cloudinary images | **Stale-while-revalidate** | Fast loads on repeat visits, updates in background |
| Map tiles (OSM/CDN) | **Network only** | Too large, dynamically fetched; not worth caching |
| API routes (`/api/*`) | **Network only** | Must be fresh; stale data is misleading for reports |
| Supabase auth | **Network only** | Session cookies are time-sensitive |

### Offline Fallback

When a navigation request fails (user is offline and the page is not cached), the service worker serves the precached static `/offline` page (`app/(public)/offline/page.tsx`, noindex) instead of a stale or login-redirect page. `/offline` embeds `<ReportForm />`, so submitting a report still works offline (queued to IndexedDB and replayed on reconnect). Only public routes are precached — `/`, `/browse`, `/offline` — so protected pages (`/submit`, `/my-reports`, `/my-feedback`, `/account`, `/feedback`) are never precached; that previously cached the login-redirect HTML (under `/submit`) and an empty shell (under `/account`) at install time. On SW `activate`, stale navigation caches (`pages`, `pages-rsc`, `pages-rsc-prefetch`, `next-data`, `others`) are deleted so an old cached login/empty page can't be served after a deploy.

## Service Worker — `app/sw.ts`

- Uses `@serwist/next/worker` with `defaultCache` for standard runtime caching rules
- `skipWaiting: true` — activates immediately after install
- `clientsClaim: true` — takes control of all open tabs
- `navigationPreload: true` — speeds up navigations by preloading while SW boots

## Install Prompt — `components/install-prompt.tsx`

### States

- **Hidden:** App already installed (matches `display-mode: standalone` media query), or browser doesn't support `beforeinstallprompt`.
- **Visible (promptable):** `beforeinstallprompt` event fired and stored. Banner shows at bottom with "Install App" + "Not now" buttons.
- **Installing:** User clicked "Install App" — `event.prompt()` called, awaiting user choice.
- **Dismissed:** User clicked "Not now" — banner hidden for this session via state.
- **Installed:** `appinstalled` event fired — banner permanently hidden for this device.

### Edge Cases

- **Already installed:** Banner never shows (CSS media query `(display-mode: standalone)`).
- **Unsupported browser:** No `beforeinstallprompt` fires; banner never renders.
- **User dismisses:** State hides banner for the current tab session; next visit still shows it (no localStorage persistence).
- **Install rejected:** User declines the install prompt — banner hides and does not re-show for this session.
- **Already prompted previously:** The `beforeinstallprompt` event only fires once per visit; subsequent visits fire it again.

## Metadata — `app/layout.tsx`

Add to existing `Metadata` export:
- `manifest: "/manifest.json"`
- `icons.icon`: array with 192x192 and 512x512 PNGs
- `icons.apple`: `/apple-icon-180x180.png`

Add new `viewport` export:
- `themeColor: "#1d4ed8"`
- `width: "device-width"`
- `initialScale: 1`

## Data Flow

```
Build time:
  next.config.ts → @serwist/next plugin
    → Reads app/sw.ts
    → Generates public/sw.js with precache manifest + runtime caching

First visit:
  Browser requests page
    → HTML loads → <link rel="manifest"> triggers manifest fetch
    → Browser registers /sw.js
    → Service worker installs → precaches JS/CSS/fonts
    → Service worker activates → takes control of page

Subsequent navigations (online):
  SW intercepts navigation request
    → Fetches from network
    → On success: caches response, returns to page
    → On failure: returns cached response (stale)

Subsequent navigations (offline):
  SW intercepts navigation request
    → Network fails (offline)
    → Returns cached page from previous visit

Install prompt flow:
  Browser detects PWA eligibility
    → Fires beforeinstallprompt on window
    → InstallPrompt component captures event, shows banner
    → User clicks "Install App"
      → event.prompt() shows native install dialog
      → User accepts → appinstalled fires → banner hidden
      → User declines → banner hidden for session
```

## Files Created

| File | Purpose |
|------|---------|
| `public/manifest.json` | Web App Manifest |
| `public/icon-192x192.png` | App icon 192x192 |
| `public/icon-512x512.png` | App icon 512x512 |
| `public/apple-icon-180x180.png` | Apple touch icon |
| `app/sw.ts` | Service worker entry point |
| `components/install-prompt.tsx` | Client component for install banner |

## Files Modified

| File | Change |
|------|--------|
| `package.json` | Add `@serwist/next`, `serwist` dependencies |
| `next.config.ts` | Wrap config with `withSerwist()` plugin |
| `app/layout.tsx` | Add `manifest`, `icons` to metadata; add `viewport` export |
| `app/(public)/layout.tsx` | Add `<InstallPrompt />` component |

## Implementation Status

| Item | Status |
|------|--------|
| `public/manifest.json` | ✅ Done |
| Generate app icons (192x192, 512x512, Apple 180x180) | ✅ Done |
| `app/sw.ts` — service worker entry | ✅ Done |
| `components/install-prompt.tsx` — client component | ✅ Done |
| `package.json` — add Serwist dependencies | ✅ Done |
| `next.config.ts` — `withSerwist()` plugin | ✅ Done |
| `app/layout.tsx` — metadata + viewport | ✅ Done |
| `app/(public)/layout.tsx` — InstallPrompt | ✅ Done |
| `npm run build` passes with zero errors | ✅ Done |

## Check When Done

- [x] `public/manifest.json` generated and valid JSON
- [x] App icons (192x192, 512x512) generated from logo
- [x] Apple touch icon generated from logo
- [x] Service worker generated at `public/sw.js` (~50KB) via `@serwist/next`
- [x] Static assets precached (verified via build output: "X precache entries")
- [ ] Service worker registered and active in browser DevTools → Application → Service Workers
- [ ] Previously visited page loads offline (Airplane mode → navigate to cached page)
- [ ] `beforeinstallprompt` fires in Chrome on mobile/desktop
- [ ] Install banner shows when eligible, hides when dismissed or installed
- [ ] "Install App" button triggers native install dialog
- [x] `theme-color` meta tag set to `#1d4ed8` in viewport export
- [x] `viewport` meta tag set to `width=device-width, initial-scale=1`
- [x] `npm run build` passes with zero errors
