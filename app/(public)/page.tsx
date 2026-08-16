import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Map,
  MapPin,
  ShieldCheck,
  Camera,
  AlertTriangle,
  Waves,
  CarFront,
  Flame,
  OctagonAlert,
  ArrowRight,
  Clock,
  Smartphone,
  CheckCircle2,
  Building2,
  Plus,
  Compass,
  FileCheck2,
  Bell,
  Sparkles,
} from "lucide-react";
import { JsonLd } from "@/components/public/json-ld";
import { SITE_URL } from "@/lib/site";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ReportCard } from "@/components/reports/report-card";

export const metadata: Metadata = {
  title: "Bantay Kalsada — Taytay Municipal Road Hazard Watch",
  description:
    "Community-driven road incident reporting for residents and motorists in Taytay, Rizal. Report potholes, flooded roads, broken signs, and road hazards with verified 48-hour moderation.",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "Bantay Kalsada — Taytay Municipal Road Hazard Watch",
    description:
      "Community-driven road incident reporting for residents and motorists in Taytay, Rizal. Verified 48-hour moderation.",
    type: "website",
    url: "/",
  },
  twitter: {
    title: "Bantay Kalsada — Taytay Municipal Road Hazard Watch",
    description:
      "Community-driven road incident reporting for residents and motorists in Taytay, Rizal. Verified 48-hour moderation.",
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": `${SITE_URL}/#organization`,
      name: "Bantay Kalsada",
      url: `${SITE_URL}`,
      logo: `${SITE_URL}/icon-512x512.png`,
      description:
        "Community-driven road incident reporting for residents and motorists in Taytay, Rizal.",
    },
    {
      "@type": "WebSite",
      "@id": `${SITE_URL}/#website`,
      url: `${SITE_URL}`,
      name: "Bantay Kalsada",
      publisher: {
        "@id": `${SITE_URL}/#organization`,
      },
    },
  ],
};

const categories = [
  {
    key: "FLOODED_ROAD",
    label: "Flooded Roads",
    description: "Submerged streets, clogged canals, impassable waterways",
    icon: Waves,
    badge: "Seasonal alert",
  },
  {
    key: "POTHOLE",
    label: "Potholes & Cracks",
    description: "Deep asphalt craters, loose gravel, and road surface damage",
    icon: AlertTriangle,
    badge: "High frequency",
  },
  {
    key: "ROAD_ACCIDENT",
    label: "Road Accidents",
    description: "Collisions, vehicular spills, overturned vehicles, and blockages",
    icon: CarFront,
    badge: "Critical",
  },
  {
    key: "ROAD_RAGE",
    label: "Road Rage Incidents",
    description: "Aggressive driving altercations, obstructions, and physical disputes",
    icon: Flame,
    badge: "Public safety",
  },
  {
    key: "BROKEN_TRAFFIC_SIGN",
    label: "Broken Traffic Signs",
    description: "Downed street signs, unreadable warnings, and damaged posts",
    icon: OctagonAlert,
    badge: "Navigation",
  },
  {
    key: "OTHER",
    label: "Other Hazards",
    description: "Fallen cables, construction debris, unlit roadworks, and sinkholes",
    icon: Sparkles,
    badge: "General",
  },
];

const barangays = [
  {
    name: "Dolores",
    slug: "DOLORES",
    desc: "Tikling, Ortigas Ave Extension, municipal hall zone",
  },
  {
    name: "San Isidro",
    slug: "SAN_ISIDRO",
    desc: "Manila East corridor, commercial hubs, garment districts",
  },
  {
    name: "San Juan",
    slug: "SAN_JUAN",
    desc: "Residential avenues, bypass connectors, and school zones",
  },
  {
    name: "Santa Ana",
    slug: "SANTA_ANA",
    desc: "Taytay Poblacion center, heritage streets, and market links",
  },
  {
    name: "Muzon",
    slug: "MUZON",
    desc: "Angono boundary routes, heavy transport lanes, and bypasses",
  },
];

export default async function Home() {
  const supabase = await createSupabaseServerClient();

  const [totalCountRes, resolvedCountRes, recentReportsRes] = await Promise.all([
    supabase
      .from("reports")
      .select("*", { count: "exact", head: true })
      .in("status", ["APPROVED", "RESOLVED"]),
    supabase
      .from("reports")
      .select("*", { count: "exact", head: true })
      .eq("status", "RESOLVED"),
    supabase
      .from("reports")
      .select("*")
      .in("status", ["APPROVED", "RESOLVED"])
      .order("submitted_at", { ascending: false })
      .limit(3),
  ]);

  const totalReports = totalCountRes.count ?? 0;
  const resolvedReports = resolvedCountRes.count ?? 0;
  const recentReports = recentReportsRes.data ?? [];

  return (
    <>
      <JsonLd data={jsonLd} />

      {/* 1. HERO SECTION */}
      <section className="relative border-b border-border py-16 sm:py-24 lg:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            {/* Civic Badge */}
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3.5 py-1 text-xs font-medium text-primary sm:text-sm">
              <MapPin className="size-3.5" />
              <span>Taytay, Rizal · Civic Road Safety Network</span>
            </div>

            {/* Main Title (Single H1) */}
            <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-5xl lg:text-6xl sm:leading-tight">
              Community road hazard monitoring for Taytay, Rizal.
            </h1>

            {/* Subtitle */}
            <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
              Report potholes, flooded corridors, broken signs, and accidents directly
              from your phone. Every report is geofenced within Taytay and reviewed
              by moderators within 48 hours.
            </p>

            {/* Action Buttons */}
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-4">
              <Button size="lg" className="w-full sm:w-auto sm:px-6" asChild>
                <Link href="/submit">
                  <Plus className="mr-2 size-4" />
                  Submit a Hazard Report
                </Link>
              </Button>
              <Button variant="outline" size="lg" className="w-full sm:w-auto sm:px-6" asChild>
                <Link href="/browse?view=map">
                  <Compass className="mr-2 size-4" />
                  Explore Live Map
                </Link>
              </Button>
            </div>

            {/* Trust Subtext */}
            <p className="mt-4 text-xs text-muted-foreground">
              No account required to browse. Offline submissions supported on mobile.
            </p>
          </div>

          {/* Civic Pulse / Metrics Strip */}
          <div className="mt-14 grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
            <div className="flex flex-col items-center justify-center rounded-lg border border-border bg-card p-4 text-center">
              <span className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                {totalReports > 0 ? totalReports : "100%"}
              </span>
              <span className="mt-1 text-xs font-medium text-muted-foreground">
                {totalReports > 0 ? "Verified Reports" : "Taytay Geofenced"}
              </span>
            </div>
            <div className="flex flex-col items-center justify-center rounded-lg border border-border bg-card p-4 text-center">
              <span className="text-2xl font-bold tracking-tight text-status-approved sm:text-3xl">
                {resolvedReports > 0 ? resolvedReports : "48h"}
              </span>
              <span className="mt-1 text-xs font-medium text-muted-foreground">
                {resolvedReports > 0 ? "Resolved Hazards" : "Target Moderation SLA"}
              </span>
            </div>
            <div className="flex flex-col items-center justify-center rounded-lg border border-border bg-card p-4 text-center">
              <span className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                5
              </span>
              <span className="mt-1 text-xs font-medium text-muted-foreground">
                Barangays Covered
              </span>
            </div>
            <div className="flex flex-col items-center justify-center rounded-lg border border-border bg-card p-4 text-center">
              <span className="text-2xl font-bold tracking-tight text-primary sm:text-3xl">
                Free
              </span>
              <span className="mt-1 text-xs font-medium text-muted-foreground">
                Public Civic Service
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* 2. HAZARD CATEGORIES JUMP MATRIX */}
      <section className="border-b border-border py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <div className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-primary">
                <AlertTriangle className="size-3.5" />
                <span>Categories</span>
              </div>
              <h2 className="mt-1 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                Browse hazards by category
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Filter active issues across Taytay to plan your daily commute safely.
              </p>
            </div>
            <Button variant="ghost" size="sm" className="self-start sm:self-auto" asChild>
              <Link href="/browse">
                View all reports
                <ArrowRight className="ml-2 size-4" />
              </Link>
            </Button>
          </div>

          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {categories.map((cat) => {
              const Icon = cat.icon;
              return (
                <Link
                  key={cat.key}
                  href={`/browse?category=${cat.key}`}
                  className="group relative flex flex-col justify-between rounded-lg border border-border bg-card p-5 transition-all hover:border-primary/50 hover:bg-card/80"
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <div className="inline-flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                        <Icon className="size-5" />
                      </div>
                      <span className="rounded-md border border-border bg-muted/60 px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                        {cat.badge}
                      </span>
                    </div>
                    <h3 className="mt-4 text-base font-semibold text-foreground group-hover:text-primary transition-colors">
                      {cat.label}
                    </h3>
                    <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
                      {cat.description}
                    </p>
                  </div>
                  <div className="mt-5 flex items-center gap-1 text-xs font-medium text-primary">
                    <span>Check reports</span>
                    <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-1" />
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* 3. RECENT COMMUNITY REPORTS SNAPSHOT */}
      <section className="border-b border-border py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <div className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-status-approved">
                <FileCheck2 className="size-3.5" />
                <span>Live Feed</span>
              </div>
              <h2 className="mt-1 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                Recent verified community alerts
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Verified incidents reported by Taytay citizens and approved by moderators.
              </p>
            </div>
            <Button variant="outline" size="sm" className="self-start sm:self-auto" asChild>
              <Link href="/browse">
                Open full feed
                <ArrowRight className="ml-2 size-4" />
              </Link>
            </Button>
          </div>

          <div className="mt-10">
            {recentReports.length > 0 ? (
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {recentReports.map((report) => (
                  <ReportCard key={report.id} report={report} />
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border bg-card/40 p-10 text-center">
                <div className="inline-flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <ShieldCheck className="size-6" />
                </div>
                <h3 className="mt-4 text-base font-semibold text-foreground">
                  No active reports right now
                </h3>
                <p className="mt-1.5 max-w-sm text-xs text-muted-foreground">
                  Be the first to report road hazards or obstructions along your commute in Taytay.
                </p>
                <Button size="sm" className="mt-5" asChild>
                  <Link href="/submit">Submit the First Report</Link>
                </Button>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* 4. BARANGAY EXPLORER MATRIX */}
      <section className="border-b border-border py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <div className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-primary">
              <Building2 className="size-3.5" />
              <span>Municipal Coverage</span>
            </div>
            <h2 className="mt-1 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              Taytay barangay coverage
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Directly access road condition reports in your barangay.
            </p>
          </div>

          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {barangays.map((bgy) => (
              <Link
                key={bgy.slug}
                href={`/browse?barangay=${bgy.slug}`}
                className="group flex flex-col justify-between rounded-lg border border-border bg-card p-4 text-left transition-all hover:border-primary/50 hover:bg-card/80"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-primary">Barangay</span>
                    <ArrowRight className="size-3.5 text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-primary" />
                  </div>
                  <h3 className="mt-2 text-base font-bold text-foreground group-hover:text-primary transition-colors">
                    {bgy.name}
                  </h3>
                  <p className="mt-1.5 text-xs leading-normal text-muted-foreground">
                    {bgy.desc}
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-border/60 text-[11px] font-medium text-muted-foreground">
                  View hazards in {bgy.name}
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* 5. THE CIVIC ENGINE / HOW IT WORKS */}
      <section className="border-b border-border py-16 sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <div className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-primary">
              <ShieldCheck className="size-3.5" />
              <span>Moderation Workflow</span>
            </div>
            <h2 className="mt-1 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              How Bantay Kalsada works
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              A transparent civic verification lifecycle from pin drop to road repair.
            </p>
          </div>

          <div className="mt-14 grid gap-8 md:grid-cols-3">
            {/* Step 1 */}
            <div className="relative flex flex-col rounded-lg border border-border bg-card p-6">
              <div className="flex items-center justify-between">
                <div className="inline-flex size-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Camera className="size-6" />
                </div>
                <span className="text-xs font-bold text-muted-foreground">STEP 01</span>
              </div>
              <h3 className="mt-5 text-base font-semibold text-foreground">
                1. Snap &amp; Pin in Taytay
              </h3>
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                Attach 1–3 photos and drop a pin. The app validates coordinates against Taytay’s
                municipal polygon boundary and displays nearby duplicates instantly.
              </p>
            </div>

            {/* Step 2 */}
            <div className="relative flex flex-col rounded-lg border border-border bg-card p-6">
              <div className="flex items-center justify-between">
                <div className="inline-flex size-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Clock className="size-6" />
                </div>
                <span className="text-xs font-bold text-muted-foreground">STEP 02</span>
              </div>
              <h3 className="mt-5 text-base font-semibold text-foreground">
                2. 48-Hour Admin Verification
              </h3>
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                Moderators review the submission for accuracy, severity, and authenticity. Spam is
                rejected with a transparent reason, keeping the public feed trustworthy.
              </p>
            </div>

            {/* Step 3 */}
            <div className="relative flex flex-col rounded-lg border border-border bg-card p-6">
              <div className="flex items-center justify-between">
                <div className="inline-flex size-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <CheckCircle2 className="size-6" />
                </div>
                <span className="text-xs font-bold text-muted-foreground">STEP 03</span>
              </div>
              <h3 className="mt-5 text-base font-semibold text-foreground">
                3. Live Map &amp; Resolution
              </h3>
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                Approved alerts appear on the public feed and heatmap. When local responders address
                the hazard, the report is marked Resolved with &quot;After&quot; photos.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 6. RESILIENCE & CITIZEN FEATURES */}
      <section className="border-b border-border py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-8 lg:grid-cols-3">
            <div className="flex flex-col justify-between rounded-lg border border-border bg-card p-6">
              <div>
                <div className="inline-flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Smartphone className="size-5" />
                </div>
                <h3 className="mt-4 text-base font-semibold text-foreground">
                  Offline-Ready PWA
                </h3>
                <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                  In areas with poor cell signal, draft reports and photos are securely preserved in
                  local storage and automatically submitted when connection returns.
                </p>
              </div>
            </div>

            <div className="flex flex-col justify-between rounded-lg border border-border bg-card p-6">
              <div>
                <div className="inline-flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Bell className="size-5" />
                </div>
                <h3 className="mt-4 text-base font-semibold text-foreground">
                  SMS &amp; Web Push Alerts
                </h3>
                <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                  Opt in to Philippine SMS alerts or browser push notifications to receive real-time
                  updates when your submitted hazard is approved or resolved.
                </p>
              </div>
            </div>

            <div className="flex flex-col justify-between rounded-lg border border-border bg-card p-6">
              <div>
                <div className="inline-flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <ShieldCheck className="size-5" />
                </div>
                <h3 className="mt-4 text-base font-semibold text-foreground">
                  Privacy &amp; EXIF Stripping
                </h3>
                <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                  Photos uploaded to Cloudinary have device EXIF metadata automatically stripped on
                  upload. Only the chosen map coordinates are stored.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 7. CLOSING ACTION / COMMUNITY CALL */}
      <section className="py-16 sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="relative overflow-hidden rounded-2xl border border-primary/30 bg-card p-8 text-center sm:p-12 lg:p-16">
            <div className="mx-auto max-w-2xl">
              <div className="mb-4 inline-flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <Map className="size-7" />
              </div>
              <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-4xl">
                Help keep Taytay&apos;s roads safe for everyone.
              </h2>
              <p className="mx-auto mt-4 max-w-lg text-sm text-muted-foreground sm:text-base">
                Whether you commute along Ortigas Extension, Cabrera Road, or Manila East Road,
                your report helps thousands of Taytayeños avoid dangerous road hazards.
              </p>
              <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-4">
                <Button size="lg" className="w-full sm:w-auto sm:px-8" asChild>
                  <Link href="/submit">Submit a Report Now</Link>
                </Button>
                <Button variant="outline" size="lg" className="w-full sm:w-auto sm:px-8" asChild>
                  <Link href="/guidelines">Submission Guidelines</Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
