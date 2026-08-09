import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Map, ShieldCheck, Camera, MessageSquare } from "lucide-react";
import { JsonLd } from "@/components/public/json-ld";
import { SITE_URL } from "@/lib/site";

export const metadata: Metadata = {
  title: "Bantay Kalsada — Report road hazards in Taytay, Rizal",
  description:
    "Report potholes, flooded roads, accidents, and other hazards in Taytay, Rizal. Bantay Kalsada lets you document road issues so everyone stays informed.",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "Bantay Kalsada — Report road hazards in Taytay, Rizal",
    description:
      "Report potholes, flooded roads, accidents, and other hazards in Taytay, Rizal.",
    type: "website",
    url: "/",
  },
  twitter: {
    title: "Bantay Kalsada — Report road hazards in Taytay, Rizal",
    description:
      "Report potholes, flooded roads, accidents, and other hazards in Taytay, Rizal.",
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
        "Bantay Kalsada lets you document potholes, flooded roads, accidents, and other hazards so everyone in Taytay stays informed.",
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

export default function Home() {
  return (
    <>
      <JsonLd data={jsonLd} />
        <section className="my-12 flex min-h-[calc(100dvh-4rem)] flex-col items-center justify-center px-4 text-center">
        <div className="mx-auto max-w-2xl">
            <div className="mb-8 inline-flex size-20 items-center justify-center rounded-3xl bg-primary/10">
              <Map className="size-10 text-primary" />
            </div>
            <h1 className="text-4xl font-bold leading-tight text-foreground sm:text-5xl lg:text-6xl">
              Report road hazards in
              <br />
              Taytay, Rizal.
            </h1>
            <p className="mx-auto mt-6 max-w-lg text-base leading-relaxed text-muted-foreground sm:text-lg">
              Bantay Kalsada lets you document potholes, flooded roads, accidents,
              and other hazards so everyone in Taytay stays informed.
            </p>
            <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-center"> 
              <Link href="/register">
                <Button size="lg" className="w-48">
                  Get started
                </Button>
              </Link>
              <Link href="/browse">
                <Button variant="outline" size="lg" className="w-48">
                  Browse reports
                </Button>
              </Link>
            </div>
          </div>
        </section>

        <hr className="border-border" />

        <section className="mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-2xl font-semibold text-foreground sm:text-3xl">
              How it works
            </h2>
            <p className="mt-3 text-sm text-muted-foreground">
              Three simple steps to report a road hazard in Taytay.
            </p>
          </div>
          <div className="mt-16 grid gap-8 sm:grid-cols-3">
            <div className="flex flex-col items-center text-center">
              <div className="mb-4 inline-flex size-14 items-center justify-center rounded-2xl bg-primary/10">
                <Camera className="size-6 text-primary" />
              </div>
              <h3 className="text-base font-semibold text-foreground">
                1. Take a photo
              </h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Snap a photo of the hazard — pothole, flood, broken sign, or
                anything that needs attention.
              </p>
            </div>
            <div className="flex flex-col items-center text-center">
              <div className="mb-4 inline-flex size-14 items-center justify-center rounded-2xl bg-primary/10">
                <Map className="size-6 text-primary" />
              </div>
              <h3 className="text-base font-semibold text-foreground">
                2. Pin the location
              </h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Drop a pin on the map so authorities know exactly
                where the issue is — reports are accepted for Taytay, Rizal only.
              </p>
            </div>
            <div className="flex flex-col items-center text-center">
              <div className="mb-4 inline-flex size-14 items-center justify-center rounded-2xl bg-primary/10">
                <MessageSquare className="size-6 text-primary" />
              </div>
              <h3 className="text-base font-semibold text-foreground">
                3. Submit &amp; track
              </h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Your report is reviewed by moderators. Get notified when it&apos;s
                approved or resolved.
              </p>
            </div>
          </div>
        </section>

        <hr className="border-border" />

        <section className="mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8">
          <div className="mx-auto flex max-w-2xl flex-col items-center text-center">
            <div className="mb-6 inline-flex size-16 items-center justify-center rounded-2xl bg-primary/10">
              <ShieldCheck className="size-8 text-primary" />
            </div>
            <h2 className="text-2xl font-semibold text-foreground sm:text-3xl">
              Verified. Reviewed. Actionable.
            </h2>
            <p className="mt-3 text-sm text-muted-foreground">
              Every report goes through an administrator review before going
              public. Only verified, accurate information reaches the feed.
            </p>
            <Link href="/submit" className="mt-8">
              <Button size="lg">
                Start reporting in Taytay
              </Button>
            </Link>
          </div>
        </section>
    </>
  );
}
