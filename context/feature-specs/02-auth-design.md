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

## Check When Done

- Full round trip works ( register → receive verification email → verify → log in)
- Password reset email arrives and new password can be set
- Profiles row is created automatically on signup. Unverified users cannot access /submit.
