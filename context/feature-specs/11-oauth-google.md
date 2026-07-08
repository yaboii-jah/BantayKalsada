# Google OAuth Login Implementation

## Design (Hallmark-informed)

- **Genre:** Utility — authentication extension. A single branded button on login and register pages that delegates to Supabase's built-in Google OAuth flow.
- **Button style:** Outlined button with the standard 4-color Google logo SVG, white background, matching the existing form button height and width. Uses `Button variant="outline"` from Shadcn/ui.
- **Divider:** A horizontal `border-t` line with "or" text centered over it, separating the Google button from the email/password form.
- **Callback route:** A dedicated `/auth/callback` route handler that exchanges the OAuth authorization code for a session via `exchangeCodeForSession()`, then redirects to `/browse` (or the `?next=` param from the original redirect).
- **Session handling:** OAuth sessions are standard Supabase sessions — the existing proxy, layout guards, and Server Actions all work without changes. `email_confirmed_at` is automatically set by Supabase for Google-authenticated users.
- **Profile creation:** The existing database trigger on `auth.users` INSERT reads `raw_user_meta_data->>'full_name'` — Google returns `full_name` in the user metadata, so new profiles are populated correctly.

### Button Visual

```
┌──────────────────────────────────┐
│  [Google SVG logo]  Continue with Google  │
└──────────────────────────────────┘
```

- Full width (`w-full`), matching the submit button
- `variant="outline"` — border with transparent background
- Google logo: inline SVG with the 4 brand colors (`#4285F4`, `#34A853`, `#FBBC05`, `#EA4335`)
- Disabled state: `opacity-50` with "Connecting…" text
- Error state: red text below the button if OAuth fails

### Divider Visual

```
         ──────── or ────────
```

- Full width, centered
- `border-t border-border` line
- "or" text in `text-muted-foreground text-xs uppercase`
- Text sits on `bg-card` background to mask the line

### States

| # | State | Visual |
|---|-------|--------|
| 1 | **Idle** | Google button visible, full opacity |
| 2 | **Loading** | Button disabled, "Connecting…" text, Google logo still visible |
| 3 | **Error** | Button re-enabled, red error text below button |
| 4 | **Success** | Browser navigates to Google consent screen → Supabase callback → app |

## Data Flow

```
User clicks "Continue with Google"
  → supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo } })
  → Supabase redirects to Google consent screen
  → User authorizes the app
  → Google redirects to Supabase with authorization code
  → Supabase exchanges code for tokens, creates/updates auth.users row
  → Supabase redirects to {redirectTo} (app/auth/callback) with session
  → auth/callback/route.ts:
      1. Reads code from URL search params
      2. Creates supabase server client with cookie handling
      3. Calls exchangeCodeForSession(code) — writes session cookies
      4. Redirects to /browse (or ?next= param)
  → Browser loads /browse with session cookie
  → Existing auth checks (proxy, layouts, Server Actions) recognize the user
```

## Implementation

1. Enable Google provider in Supabase Dashboard — requires Client ID and Client Secret from Google Cloud Console
2. Create `app/auth/callback/route.ts` — OAuth callback route handler
3. Create `components/auth/google-sign-in.tsx` — Google branded button component
4. Update `app/(auth)/login/page.tsx` — add Google button + divider
5. Update `app/(auth)/register/page.tsx` — add Google button + divider
6. Update `context/progress-tracker.md`
7. Update `context/project-overview.md` — move OAuth from Out of Scope to In Scope
8. Update `context/architecture.md` — mention Google OAuth
9. Write `context/feature-specs/11-oauth-google.md`
10. Verify `npm run build` passes with zero errors

## Implementation Status

| Item | Status |
|---|---|
| `app/auth/callback/route.ts` — OAuth code exchange | ✅ Built |
| `components/auth/google-sign-in.tsx` — Google button | ✅ Built |
| `app/(auth)/login/page.tsx` — Google button + divider | ✅ Built |
| `app/(auth)/register/page.tsx` — Google button + divider | ✅ Built |
| `context/progress-tracker.md` — updated | ✅ Built |
| `context/project-overview.md` — moved to In Scope | ✅ Built |
| `context/architecture.md` — OAuth noted | ✅ Built |
| `context/feature-specs/11-oauth-google.md` — written | ✅ Built |
| `npm run build` passes with zero errors | ✅ Built |

## Check When Done

- [x] Google provider enabled in Supabase Dashboard with valid Client ID + Secret
- [x] `app/auth/callback/route.ts` — exchanges code via `exchangeCodeForSession()`, redirects to `?next=` or `/browse`
- [x] `GoogleSignIn` component renders a branded button with Google SVG logo
- [x] Button calls `supabase.auth.signInWithOAuth({ provider: "google" })` with correct `redirectTo`
- [x] Loading state shows "Connecting…" and disables button
- [x] Error state shows error text below button
- [x] Google button appears on `/login` with label "Continue with Google"
- [x] Google button appears on `/register` with label "Sign up with Google"
- [x] Divider ("or" line) separates Google button from email/password form
- [x] `redirect` param from URL is forwarded through the OAuth flow
- [x] Existing auth checks (proxy, layouts, Server Actions) work with OAuth sessions
- [x] OAuth users have `email_confirmed_at` set automatically (no verification gate issue)
- [x] Database trigger creates `profiles` row with `full_name` from Google metadata
- [x] No server-side packages added
- [x] `npm run build` passes with zero errors

## Files Added / Modified

### `app/auth/callback/route.ts` — OAuth callback route

Route handler that receives the redirect after Google authorization. Uses `createServerClient` from `@supabase/ssr`:

1. Reads `code` and `next` from the URL search params
2. If `code` exists: creates a server client with cookie `setAll` that writes session cookies to `request.cookies`, calls `exchangeCodeForSession(code)`, then copies cookies from `request.cookies` to a `NextResponse.redirect()` response
3. `NextResponse.next()` cannot be used in route handlers — the session cookies must be set directly on `request.cookies` during exchange, then copied to the redirect response
4. If `code` is missing: redirects to `/login?error=OAuth failed`

The route is dynamic (Server-side rendering) and never cached.

The route is dynamic (Server-side rendering) and never cached.

### `components/auth/google-sign-in.tsx` — Google branded button

Client component wrapping the OAuth flow:

- **Props:** `redirect?: string` (the path to redirect to after auth), `label?: string` (defaults to "Continue with Google")
- **Flow:** Calls `supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo } })` where `redirectTo` is constructed as `window.location.origin + "/auth/callback?next=" + encodeURIComponent(redirect)`
- **States:** idle (button + logo visible), loading (disabled + "Connecting…"), error (red text below)
- **Styling:** Outlined Shadcn button, full width, Google 4-color SVG logo at `size-4`

### `app/(auth)/login/page.tsx`

- Added import: `GoogleSignIn` from `@/components/auth/google-sign-in`
- Added `<GoogleSignIn redirect={redirect} />` before the error alert
- Added "or" divider between the Google button and the error alert/form

### `app/(auth)/register/page.tsx`

- Added import: `GoogleSignIn` from `@/components/auth/google-sign-in`
- Added `<GoogleSignIn label="Sign up with Google" />` before the error alert
- Added "or" divider between the Google button and the error alert/form

### Unchanged files

- `proxy.ts` — OAuth sessions are standard Supabase sessions; existing redirect logic works
- All Supabase client factories — no changes needed
- All Server Actions — no changes needed
- Auth layout, AuthCard — no changes needed
- Database — no migrations needed (trigger already handles OAuth signups)
- Admin panel — unchanged
