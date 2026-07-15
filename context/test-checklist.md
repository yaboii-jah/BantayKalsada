( Do not mind this file, this is just for guide when testing the app feature, this will probably change overtime. do not make changes in this file unless i say so)

### Checklist

## Boundary Enforcement
/ - Submit a report inside Taytay → accepted (check DB: barangay detected, lat/lng within polygon)  
/ - Submit a report outside Taytay (e.g., Antipolo, Manila) → rejected with error toast   
/ - Existing pre-scope reports still render on browse/detail pages
/ - Edit an in-bounds report's lat/lng → allowed
/ - Edit an out-of-bounds report's lat/lng → rejected by trigger
/ - Direct DB insert outside Taytay → blocked by trigger

## Browse Feed
/ - Filter by barangay → only matching reports shown
/ - Filter by barangay + category + status → combined AND
/ - Barangay param preserved in pagination
/ -  Barangay param preserved in map/grid toggle
/ - "No reports match" shows when barangay filter yields 0 results
/ - clear filters resets barangay too

## Report Card
/ - Card shows "Barangay {name}" label on reports with barangay
/ - Card shows no barangay label on null-barangay (pre-scope) reports
/ - Card layout doesn't break on long barangay names

## Report Detail Page
/ - Detail page shows Building2 icon + "Barangay {name}" in metadata row
/ - Missing barangay → no row shown (no icon)

## Landing Page
/ - Hero text says "Report road hazards in Taytay, Rizal."
/ - Step 2 mentions "reports are accepted for Taytay, Rizal only"
/ - CTA says "Start reporting in Taytay"

## Submit Page
/ - Info banner "📍 Reports accepted for Taytay, Rizal only" visible
/ - Map defaults to Taytay center (zoom 14)
/ - Barangay dropdown populated with 5 barangays

## Admin Queue Pages
/ - Pending/Approved/Rejected/Resolved tables show Barangay column
/ - Column shows barangay name or "—" for null
/ - Review page shows "Barangay {name}" in submitter section
/ - Missing barangay → no row shown

## Analytics Dashboard
/ - Dashboard shows "By Barangay" horizontal bar chart
/ - Chart colors match the 5 barangay palette
/ - Data aggregates correctly across statuses

## Mobile / Responsive
/ - Barangay filter dropdown works on mobile (no clipping)
- Barangay column in admin table readable on narrow screens (truncation ok)
/ - Landing page copy fits on mobile viewports

## Regression
/ - Submit a report without a location (if allowed) → no error
/ - Google OAuth login works after all changes
/ - Search (ILIKE) still works with barangay filter
/ - Map view still works with barangay filter
/ - Bulk admin actions still work with new Barangay column
/ - npm run build → zero errors (pre-confirmed)