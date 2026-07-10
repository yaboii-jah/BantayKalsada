# Bantay Kalsada

## Overview

Bantay Kalsada is a community-driven road incident reporting web application built for Filipino citizens. It allows registered users to submit reports of road hazards — such as potholes, flooded roads, broken traffic signs, and road accidents — by providing a title, description, category, between one and three photos, and a pinned map location. Users register with an email and password and must verify their email address before submitting reports. Submitted reports go through an administrator moderation queue before becoming publicly visible. Approved reports appear in a public feed that any visitor can browse, search, and filter, giving road users actionable awareness of hazards in their area.

## Goals

1. Enable any registered and verified citizen to submit a road incident report in under two minutes, including at least one photo and a map pin.
2. Give administrators a clear moderation queue where every submitted report is reviewed and actioned — approved, rejected with a reason, or resolved — within 48 hours.
3. Provide a publicly accessible, filterable feed of approved road hazard reports so that any visitor can browse known hazards without needing an account.

## Core User Flow

1. A visitor registers for an account using their name, email, and password.
2. The visitor verifies their email address by clicking a link sent to their inbox.
3. The verified citizen logs in and clicks "Submit Report."
4. The citizen fills out the report form: selects a category, enters a title and description, uploads between one and three photos, and pins the incident location on the map.
5. The citizen submits the report; it is saved with a `PENDING` status and a confirmation email is sent.
6. An administrator logs in to the admin panel and opens the pending report queue.
7. The administrator reviews the report's full details — photos, description, category, and pinned location.
8. The administrator approves the report; its status changes to `APPROVED` and the reporter receives an email notification.
9. The approved report appears on the public feed, visible to all visitors without an account.
10. When the issue is addressed, the administrator marks the report as `RESOLVED`; the reporter receives a resolution email notification.
11. The resolved report remains visible on the public feed with a "Resolved" badge.

## Features

### Public Feed (No Account Required)

- Browse all approved and resolved road incident reports in a paginated list.
- View the full details of any approved report: title, category, status badge, description, photo gallery (up to 3 photos), pinned map location, and submission date.
- Filter reports by category (Pothole, Flooded Road, Road Accident, Road Rage, Other Road Hazard).
- Filter reports by status (Approved, Resolved).

### Citizen Reporting

- Register for an account with a name, email, and password.
- Verify email address by clicking a link sent to the inbox; email verification is required before submitting reports.
- Log in and log out securely.
- Reset a forgotten password via an emailed reset link.
- Submit a road incident report with a required title, description, category, between one and three photos (each max 5 MB), and a pinned map location.
- Use the device's GPS to automatically center the map on the current location.
- Add, preview, and individually remove photos before submitting (minimum 1, maximum 3).
- Receive an email notification when a submitted report is approved, rejected (with the rejection reason), or resolved.
- View a personal report history listing all own submissions with their current status.
- View the rejection reason for any rejected report in the personal report history.

### Admin Moderation

- Access a protected admin panel, separate from the citizen-facing UI, at `/admin`.
- View a paginated queue of all pending reports sorted by submission date (oldest first).
- Open a report to review its full details: submitter name, email, category, title, description, photo gallery (up to 3 photos), pinned location, and submission timestamp.
- Approve a report, changing its status to `APPROVED` and triggering an email notification to the reporter.
- Reject a report with a mandatory written reason, changing its status to `REJECTED` and sending the reason to the reporter via email.
- Mark an approved report as `RESOLVED`, triggering an email notification to the reporter.
- View separate lists of approved, rejected, and resolved reports for audit and record-keeping.
- View an admin analytics dashboard with status counts, submission trend chart (30 days), category distribution, status distribution donut, approval rate, and average resolution time.

## Scope

### In Scope

- User registration, email verification, login, and password reset via Supabase Auth, with Google OAuth login.
- Road incident report submission with a minimum of 1 and a maximum of 3 photos (each max 5 MB per file) and a required map pin.
- Five predefined report categories: Pothole, Flooded Road, Road Accident, Road Rage Incident, Other Road Hazard.
- Admin moderation queue with approve, reject (with reason), and resolve actions.
- Report status lifecycle: `PENDING → APPROVED → RESOLVED` and `PENDING → REJECTED`.
- Public report feed with category and status filters, keyword search, and map view.
- Email notifications to reporters on report approval, rejection, and resolution.
- Citizen personal report history with status and rejection reason visibility.
- Admin panel with report counts and status-separated lists, plus analytics dashboard (charts for submissions over time, category/status distribution, approval rate, and average resolution time).
- Image upload to Cloudinary with EXIF metadata stripped on upload.
- Interactive map using Leaflet.js and OpenStreetMap tiles.
- Rate limiting: maximum 5 report submissions per citizen per 24-hour window.
- In-app notification center: bell icon with unread badge, lazy-loaded dropdown, mark as read, and delete/clear all.
- Map-view bounding box filter: as the user pans/zooms the map on `/browse?view=map`, markers and report count auto-constrain to the current viewport.
- App feedback system: any logged-in user can submit bug reports, feature requests, or general feedback with an optional 1–5 star rating. Admins view submissions in a dedicated inbox and can acknowledge or close them. Status changes and admin notes trigger in-app notifications and emails. Admins can add, edit, and remove internal notes on feedback submissions that are visible to the citizen.
- Progressive Web App (PWA) support: manifest.json for installability, service worker for offline caching (static assets, pages, and images), and an in-app install banner.

### Out of Scope

- Native iOS or Android mobile applications.
- SMS notifications.
- Facebook or other OAuth login providers — planned for v1.1.
- Report upvoting, confirmations, or community interactions.
- User account management by admins (suspend, ban, or delete users).
- Integration with government systems such as MMDA, DPWH, or LGU APIs.
- AI-assisted moderation or duplicate detection.
- Comments or discussion threads on reports.
- Social media sharing of reports.
- Multi-role or region-scoped administrator accounts.

## Success Criteria

1. A registered and verified citizen can submit a road incident report — including between one and three photos and a map pin — and see it appear in their personal report history with a `PENDING` status.
2. An administrator can log in to the admin panel, open a pending report, and approve it; the approved report immediately appears on the public feed and the reporter receives an approval email.
3. An administrator can reject a pending report with a written reason; the reporter sees the rejection reason in their personal report history.
4. An administrator can mark an approved report as resolved; the report displays a "Resolved" badge on the public feed and the reporter receives a resolution email.
5. Any visitor without an account can browse the public feed in grid or map view, search by keyword, filter by category and status, and view the full details of an approved report including its photo gallery.
6. No report submitted by a citizen is visible on the public feed until an administrator explicitly approves it.
7. A citizen who submits more than 5 reports within a 24-hour window is blocked from submitting additional reports until the window resets.
