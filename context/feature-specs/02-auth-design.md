Implementation of the authentication and UI/UX on the login and register page

## Design 

Create a modern, responsive authentication page with a centered, rounded container divided into two sections

### Login and register pages : 

- The left section should serve as a branding panel containing the app logo, name, a short tagline, optional feature highlights, and a subtle illustration or gradient background.
- The right section should contain either the Login or Register form with clean input fields, a primary action button, optional social login, and links such as "Forgot Password?" or "Login/Register." Use a minimal SaaS-inspired design with generous whitespace, soft shadows, rounded corners, smooth hover/focus animations, and a professional  color palette.
- Keep the layout minimal and professional.

## Implementation 

- /register page: name, email, password form. On submit, calls supabase.auth.signUp() passing full_name in the options.data field so the trigger can pick it up. Shows a "check your email" confirmation screen after submit.
- /login page: email and password form. On submit, calls supabase.auth.signInWithPassword(). Redirects to feed ( empty for now ) on success.
- /reset-password page: two states — (1) enter email to request reset link, (2) set new password when arriving from Supabase's reset email link.
- Server-side session check working: any Server Component or Route Handler can call the Supabase server client and read supabase.auth.getUser().
- Verify the profiles trigger fires: after registering a new account, a corresponding row must appear in the profiles table with role: CITIZEN and the correct full_name and email.
- Email verification gate: a user whose email_confirmed_at is null is redirected away from /submit with a prompt to verify their email.

## Implementation Status

| Item | Status |
|---|---|
| `/login` page with email/password form | ✅ Built |
| `/register` page with name/email/password + confirmation screen | ✅ Built |
| `/reset-password` page (two states: email input + new password) | ✅ Built |
| `/browse` page with empty state (post-login redirect target) | ✅ Built |
| `/verify-email` informational page | ✅ Built |
| `proxy.ts` route protection (auth routing, protected routes, verification gate) | ✅ Built |
| Auth card component with split branding + form layout | ✅ Built |
| Branding panel with logo, tagline, feature highlights | ✅ Built |
| Auth gradient background (`bg-auth-gradient`) | ✅ Built |
| Mobile responsive (stacked layout below 640px) | ✅ Built |
| Error handling — form-level Alert banner for Supabase errors | ✅ Built |
| Pending: Integration test with live Supabase project | ⏳ Pending |

## Check When Done

- [ ] Full round trip works (register → receive verification email → verify → log in)
- [ ] Password reset email arrives and new password can be set
- [ ] Profiles row is created automatically on signup
- [ ] Unverified users cannot access /submit

---

## Files Added / Modified               

### `proxy.ts` — Route protection middleware (Next.js 16 proxy file)

Replaces the deprecated `middleware.ts`. Calls `updateSession()` to refresh Supabase auth cookies on every request, then applies three redirect rules:

- **Authenticated on auth routes** (`/login`, `/register`, `/reset-password`) → redirect to `/browse`
- **Unauthenticated on protected routes** (`/submit`, `/my-reports`, `/admin`) → redirect to `/login` with a `?redirect=` param so the user is sent back after login
- **Unverified on `/submit`** → redirect to `/verify-email`

The Supabase server client is created directly in the proxy to read `auth.getUser()` from the request cookies. `createServerClient` is used with `setAll` as a no-op (session mutation is handled by `updateSession`).

### `app/globals.css` — Auth gradient utility class

Adds `bg-auth-gradient` using Tailwind v4's `@utility` directive. The gradient uses three stops from the project's OKLCH token system — a very light blue (`oklch(0.965 0.01 260)`), white, and a light indigo (`oklch(0.96 0.008 250)`) — subtly framing the auth card against a plain white page.

### `components/auth/auth-card.tsx` — Split card container

The card IS the container — not a wrapper with a split inside it. On desktop (`sm:` breakpoint) the card is a horizontal flex container: the first child (branding panel) takes 45% width, the form side takes 55%. On mobile it stacks vertically. Uses the existing Shadcn `bg-card`, `rounded-xl`, `shadow-lg`, and `ring-1` tokens.

### `components/auth/branding-panel.tsx` — Left-side branding panel

Shows the Bantay Kalsada logo (ShieldCheck icon from Lucide + wordmark), a short tagline about community safety, and three feature highlight bullets. Background uses a subtle primary-tinted gradient (`from-primary/5`). Hidden on mobile via `hidden sm:block` — replaced by a minimal footer note inside the form column.

### `app/(auth)/layout.tsx` — Auth route group layout

Wraps all `(auth)` pages with `min-h-dvh` centered layout using the gradient background. Renders the `AuthCard` component with the page content as children.

### `app/(auth)/login/page.tsx` — Login form

Client component. Email + password fields using Shadcn `Input` and `Label`. On submit, calls `createSupabaseBrowserClient().auth.signInWithPassword()`. On success, calls `router.push(redirect)` (defaults to `/browse`). On error, shows a red `Alert` banner above the form with a user-friendly message (maps `"Invalid login credentials"` → `"Invalid email or password."`). Includes a "Forgot password?" link to `/reset-password` and a "Create one" link to `/register`. The redirect param comes from `useSearchParams()`, so the component is wrapped in `<Suspense>` to satisfy Next.js's static rendering requirement.

### `app/(auth)/register/page.tsx` — Registration form

Client component. Name + email + password fields. Calls `supabase.auth.signUp()` with `full_name` passed in `options.data` so the database trigger picks it up. On success, switches to a confirmation screen with an envelope icon and the message "Check your email" with the submitted email displayed. A "Use a different email" button resets to the form. Maps `"already registered"` errors to `"An account with this email already exists."` Minimal validation: all fields required, password min 6 chars.

### `app/(auth)/reset-password/page.tsx` — Password reset (two states)

**State 1 — Email input:** Form to request a reset link. Calls `supabase.auth.resetPasswordForEmail()` with a `redirectTo` pointing back to `/reset-password`. On submit, shows a confirmation screen with a 60-second cooldown on the "Send again" button (countdown timer using `setInterval`). Rate-limit errors from Supabase are caught and shown as `"Too many requests. Please wait a minute and try again."`

**State 2 — Set new password:** Detected via `supabase.auth.onAuthStateChange` listening for the `"PASSWORD_RECOVERY"` event (fires when the page loads with `#type=recovery` in the URL hash from Supabase's reset email link). Shows a new password field. Calls `supabase.auth.updateUser()` to set the new password, then redirects to `/browse`. Handles `"same password"` errors with a specific message.

### `app/browse/page.tsx` — Report feed (empty state)

Post-login redirect target. Shows a simple header with the app name and auth buttons (Sign in / Get started). The main content is a centered empty state with a Map icon, "No reports yet" heading, description text, and a "Submit a report" CTA button linking to `/submit` (which is protected by `proxy.ts`).

### `app/verify-email/page.tsx` — Email verification prompt

Standalone page (not in a route group) that users are redirected to when they are authenticated but have `email_confirmed_at === null` and try to access `/submit`. Shows a Mail icon, "Verify your email" heading, explanation text, and a "Back to browse" button. Uses the same `bg-auth-gradient` background and card styling for visual consistency.

### `context/progress-tracker.md` — Updated session notes

Documents all architecture decisions from this implementation: auth gradient token, card-as-container layout, branding panel behavior, error handling pattern, proxy route protection rules, and post-login redirect target.
