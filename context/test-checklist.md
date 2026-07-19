( Do not mind this file, this is just for guide when testing the app feature, this will probably change overtime. do not make changes in this file unless i say so)

### Checklist

## Traffic Layer (Road Coloring — Phase B)
/ - "Traffic" toggle appears top-right, stacked UNDER the "Heat" toggle (both visible)
/ - Traffic toggle defaults to OFF; filled (primary) when on, muted when off
/ - Toggle ON → roads render green/yellow/orange/red (TomTom raster tiles); tiles load automatically via `GET /api/traffic/tiles/{z}/{x}/{y}`
/ - Toggle OFF → road colors removed; map does NOT refit
/ - Heat and Traffic toggles are independent (each works without affecting the other)
/ - Markers stay clickable and clustered above the traffic layer
/ - Count bar still tracks markers only (unchanged by Traffic)
/ - Filters (category/status/barangay) do not affect the traffic layer
/ - After a code change: unregister SW + hard-reload (stale SW serves old bundle)

## Traffic Layer — Setup & Degradation
/ - `TOMTOM_API_KEY` set in `.env.local` and deploy secrets
/ - No key → tile proxy returns 500; Traffic toggle mounts but shows nothing, no crash
/ - No DB table or migration required

## Bugfix Verification (Browse Map)
/ - Dark mode: tap a marker → popup description is dark-on-white and readable (not light-on-white)
/ - Filters yield 0 reports → "No reports in this area" + Reset works, NO "Bounds are not valid" console error
/ - Reset refits map to all reports (or to hazard heat when 0 reports)
