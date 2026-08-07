import type { Metadata } from "next";
import Link from "next/link";
import { ContentPage, ContentSection, ContentList } from "@/components/public/content-page";
import { Mail } from "lucide-react";

export const metadata: Metadata = {
  title: "About | Bantay Kalsada",
  description:
    "Bantay Kalsada is a community-driven road hazard reporting platform for Taytay, Rizal. Learn about our mission, how reports are moderated, and how to reach us.",
};

const CONTACT_EMAIL = "jahmelldorias17@gmail.com";

export default function AboutPage() {
  return (
    <ContentPage
      title="About Bantay Kalsada"
      intro="A community-driven road hazard reporting platform for Taytay, Rizal."
    >
      <ContentSection title="Our mission">
        <p>
          Bantay Kalsada lets residents of Taytay, Rizal document potholes,
          flooded roads, accidents, broken signs, and other road hazards so
          everyone in the community stays informed and can act safely.
        </p>
        <p>
          We believe that road safety starts with shared awareness. By making
          approved reports publicly visible — complete with photos and a pinned
          location — we give road users a clearer picture of the hazards around
          them and give local authorities a community-maintained record of
          issues that need attention.
        </p>
      </ContentSection>

      <ContentSection title="How it works">
        <ContentList
          items={[
            <span key="1">
              Citizens submit a report with a title, description, category,
              barangay, one to three photos, and a pinned map location.
            </span>,
            <span key="2">
              An administrator reviews every submission and approves, rejects,
              or resolves it — with the goal of acting on every report within
              48 hours.
            </span>,
            <span key="3">
              Approved and resolved reports appear on the public feed, where
              any visitor can browse, search, filter, and view full details.
            </span>,
          ]}
        />
      </ContentSection>

      <ContentSection title="Scope">
        <p>
          Bantay Kalsada currently covers the municipality of Taytay, Rizal.
          Every pinned location is validated to fall within Taytay&apos;s
          municipal boundary before a report can be submitted.
        </p>
      </ContentSection>

      <ContentSection title="Moderation">
        <p>
          Every report is reviewed by a human administrator before it goes
          public. Only accurate, relevant submissions reach the feed. Reporters
          are notified — by email, SMS (if opted in), and in-app — when their
          report is approved, rejected (with the reason), or resolved.
        </p>
      </ContentSection>

      <ContentSection title="Get in touch">
        <p>
          Have a question, a bug to report, or a feature idea? You can send
          feedback straight from inside the app via the{" "}
          <Link
            href="/feedback"
            className="font-medium text-primary underline-offset-2 hover:underline"
          >
            Feedback
          </Link>{" "}
          page, or email us directly.
        </p>
        <div className="flex items-center gap-2 text-foreground">
          <Mail className="size-4" />
          <a
            href={`mailto:${CONTACT_EMAIL}`}
            className="font-medium text-primary underline-offset-2 hover:underline"
          >
            {CONTACT_EMAIL}
          </a>
        </div>
      </ContentSection>
    </ContentPage>
  );
}
