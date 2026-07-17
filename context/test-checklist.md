( Do not mind this file, this is just for guide when testing the app feature, this will probably change overtime. do not make changes in this file unless i say so)

### Checklist

## Heatmap (Browse Map Overlay)
/ - `/browse?view=map` shows markers AND heat by default (overlay, not a mode switch)
/  - "Heat" toggle button visible top-right; filled (primary) when on, muted when off
/  - Clicking Heat (off) hides the heat underlay; markers remain and stay clickable
/  - Clicking Heat (on) re-adds the heat; map does NOT refit on toggle
/ - Markers remain clustered and popups open while heat is on
/ - Heat reflects ALL APPROVED/RESOLVED Taytay reports (ignores category/status/barangay filters)
/ - Emergency reports render hotter (red) than Minor (blue) — severity weighting (MINOR=1 / URGENT=2 / EMERGENCY=3)
/ - "Showing X of Y in this area" count bar tracks markers (viewport), not the heat
/ - Filtering by category/status/barangay changes markers but heat stays municipality-wide
/ - Heat-only view (filters yield 0 markers) still shows heat across Taytay/ - No reports AND no heat 
points → "No reports to show on map"
/ - Heat toggle is tappable and visible on mobile map view
/ - After a code change, unregister SW + hard-reload (stale service worker serves old bundle)
/ - `npm run build` → zero errors
