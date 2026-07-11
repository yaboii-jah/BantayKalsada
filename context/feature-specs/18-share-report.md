# Share Report via Link/Social

## Design

- **Genre:** Utility — makes report URLs render as rich link previews when shared on social platforms and messaging apps, plus an in-app share button.
- **Architecture:** `generateMetadata` on the report detail page dynamically constructs Open Graph (`og:`) and Twitter Card meta tags from the report's title, description, and first photo. A lightweight client component offers `navigator.share()` with a clipboard fallback.
- **No new API routes or DB changes** — the OG image is simply the first Cloudinary photo URL already stored on the report record. No dynamic image generation endpoint is needed.

### Entry Points

| Entry | Route | Purpose |
|-------|-------|---------|
| Share button | `/reports/[id]` | Triggers native share sheet or copies link |
| OG meta tags | `/reports/[id]` | Rendered in `<head>` for social platform scrapers |

## Open Graph Metadata

| Tag | Source | Notes |
|-----|--------|-------|
| `og:title` | `report.title` | Natural max 100 chars — fits OG 60–90 char recommendation |
| `og:description` | `report.description` | Truncated to 160 chars server-side via `slice(0, 160).trim()` + `"..."` if longer |
| `og:image` | `report.photo_urls[0]` | First Cloudinary photo URL, passed through `getDisplayUrl()` |
| `og:url` | Absolute URL | `https://bantay-kalsada.vercel.app/reports/${id}` (reads `VERCEL_URL` or falls back to host header) |
| `og:type` | `"article"` | Static |
| `og:site_name` | `"Bantay Kalsada"` | Static |
| `twitter:card` | `"summary_large_image"` | Makes the image display large on X/Twitter embeds |
| `twitter:title` | Same as `og:title` | — |
| `twitter:description` | Same as `og:description` | — |
| `twitter:image` | Same as `og:image` | — |

## Share Button — `components/reports/share-button.tsx`

### States

- **Supported (mobile/desktop with Web Share API):** Shows share icon button. Click calls `navigator.share({ title, text, url })` which opens the native OS share sheet. On success/failure, no UI feedback needed (native sheet handles it).
- **Fallback (desktop without Web Share API):** Shows share icon button. Click copies the report URL to clipboard, shows a `toast.success("Link copied")`.
- **Loading:** Not applicable — no async operation before the click.
- **Error:** Clipboard write fails → `toast.error("Failed to copy link")`.

### Edge Cases

- **Report not shareable (PENDING/REJECTED):** The share button only appears on the public detail page which already filters to `APPROVED`/`RESOLVED` only. No additional guard needed.
- **No photos:** If `photo_urls` is empty, `og:image` is omitted entirely. The preview will show without an image — acceptable fallback.
- **VERCEL_URL not set in dev:** Falls back to `req.headers.get("host")` for the absolute URL. In dev, the preview will use `http://localhost:3000` — acceptable; scrapers won't hit localhost.

## Data Flow

```
User shares a report link:
  → Recipient pastes URL into Facebook/Messenger/X/iMessage
  → Platform's crawler fetches https://bantay-kalsada.vercel.app/reports/[id]
  → Next.js server calls generateMetadata({ params: { id } })
    → Fetches report from Supabase (APPROVED/RESOLVED only, same query as page)
    → Returns og:title, og:description, og:image, twitter:card
  → Platform renders rich card preview

User taps share button on /reports/[id]:
  → ShareButton component checks navigator.share support
  → If supported: navigator.share({ title: report.title, url: window.location.href })
    → OS native share sheet opens (copy, social apps, messaging)
  → If not supported: navigator.clipboard.writeText(window.location.href)
    → toast.success("Link copied")
```

## Files Created

| File | Purpose |
|------|---------|
| `components/reports/share-button.tsx` | Client component with Web Share API + clipboard fallback |

## Files Modified

| File | Change |
|------|--------|
| `app/(public)/reports/[id]/page.tsx` | Add `generateMetadata` export with OG + Twitter tags |

## Implementation Status

| Item | Status |
|------|--------|
| `components/reports/share-button.tsx` — share button component | ✅ Done |
| `app/(public)/reports/[id]/page.tsx` — `generateMetadata` with OG tags | ✅ Done |
| `npm run build` passes with zero errors | ✅ Done |

## Check When Done

- [ ] Shared report link shows rich preview on Facebook (og:title, og:description, og:image)
- [ ] Shared report link shows large image card on X/Twitter (twitter:card: summary_large_image)
- [x] Share button on `/reports/[id]` triggers native share sheet on mobile Chrome/Safari
- [x] Share button copies link to clipboard on desktop browsers without Web Share API
- [x] Clipboard success shows toast "Link copied"
- [x] Clipboard failure shows toast "Failed to copy link"
- [x] Report with no photos omits og:image gracefully (no broken image in preview)
- [x] `npm run build` passes with zero errors
