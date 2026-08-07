import type { Metadata } from "next";
import { ContentPage, ContentSection, ContentList } from "@/components/public/content-page";

export const metadata: Metadata = {
  title: "Privacy Policy | Bantay Kalsada",
  description:
    "How Bantay Kalsada collects, uses, and protects your personal data, in line with the Philippine Data Privacy Act of 2012 (RA 10173).",
};

const CONTACT_EMAIL = "jahmelldorias17@gmail.com";

export default function PrivacyPage() {
  return (
    <ContentPage
      title="Privacy Policy"
      intro="Effective date: August 8, 2026. Bantay Kalsada handles personal data in accordance with the Philippine Data Privacy Act of 2012 (Republic Act No. 10173)."
    >
      <ContentSection title="Data controller and contact">
        <p>
          Bantay Kalsada is a community-driven project. For any privacy-related
          question, or to exercise your rights under the Data Privacy Act,
          contact us at{" "}
          <a
            href={`mailto:${CONTACT_EMAIL}`}
            className="font-medium text-primary underline-offset-2 hover:underline"
          >
            {CONTACT_EMAIL}
          </a>
          .
        </p>
      </ContentSection>

      <ContentSection title="What we collect">
        <ContentList
          items={[
            <span key="1">
              <strong className="text-foreground">Account information:</strong>{" "}
              your name and email address. If you sign in with Google, we use
              the name and email provided by your Google account.
            </span>,
            <span key="2">
              <strong className="text-foreground">Report content:</strong>{" "}
              title, description, category, severity, barangay, up to three
              photos, a pinned map location, and an optional human-readable
              location label.
            </span>,
            <span key="3">
              <strong className="text-foreground">Optional contact:</strong> a
              Philippine mobile number and SMS notification preference, if you
              choose to opt in on the Account Settings page.
            </span>,
            <span key="4">
              <strong className="text-foreground">Push subscriptions:</strong>{" "}
              browser push notification endpoints when you enable
              notifications.
            </span>,
            <span key="5">
              <strong className="text-foreground">Usage and security data:</strong>{" "}
              a hashed (one-way) version of your IP address used only for rate
              limiting abuse on our public API. Raw IP addresses are never
              stored.
            </span>,
          ]}
        />
      </ContentSection>

      <ContentSection title="How we use your data">
        <ContentList
          items={[
            <span key="1">To operate the service — submit, moderate, and display road hazard reports.</span>,
            <span key="2">To notify you about your reports (approval, rejection, resolution) via in-app, email, SMS, or push — depending on your preferences.</span>,
            <span key="3">To allow you to manage your own reports, feedback, comments, and flags.</span>,
            <span key="4">To prevent abuse, spam, and fraud through rate limiting.</span>,
            <span key="5">To improve the product using aggregated, non-personal statistics.</span>,
          ]}
        />
        <p>
          Our legal basis for processing is <strong className="text-foreground">consent</strong>,
          which you give when you create an account and submit content.
        </p>
      </ContentSection>

      <ContentSection title="What is publicly visible">
        <p>
          Approved and resolved reports — including photos, description,
          barangay, and pinned location — are visible to the public on the
          report feed. Your name is shown as the reporter only to
          administrators. Rejection reasons are private and visible only to
          you. Comments on reports are public and display your name.
        </p>
      </ContentSection>

      <ContentSection title="Service providers">
        <p>
          We use trusted third-party services that may process your data on our
          behalf:
        </p>
        <ContentList
          items={[
            <span key="1">Vercel — application hosting.</span>,
            <span key="2">Supabase — database, authentication, and file/metadata storage.</span>,
            <span key="3">Cloudinary — photo storage and delivery. EXIF metadata is stripped on upload.</span>,
            <span key="4">Brevo — transactional email delivery.</span>,
            <span key="5">PhilSMS — SMS delivery (only if you opt in).</span>,
            <span key="6">OpenStreetMap, Nominatim, and TomTom — map tiles, reverse geocoding, and traffic overlays.</span>,
            <span key="7">Google — OAuth sign-in.</span>,
          ]}
        />
      </ContentSection>

      <ContentSection title="Retention">
        <p>
          Account data is kept while your account is active. Report data is
          retained as long as it appears on the public feed. You can delete
          your own comments, flags, and notifications at any time. To request
          erasure of your account or reports, contact us at{" "}
          <a
            href={`mailto:${CONTACT_EMAIL}`}
            className="font-medium text-primary underline-offset-2 hover:underline"
          >
            {CONTACT_EMAIL}
          </a>
          .
        </p>
      </ContentSection>

      <ContentSection title="Your rights under RA 10173">
        <p>
          You have the right to be informed, to access, to object, to correct,
          to erase or block, and to data portability with respect to your
          personal data. To exercise any of these rights, email us and we will
          respond within a reasonable timeframe.
        </p>
      </ContentSection>

      <ContentSection title="Cookies and analytics">
        <p>
          We do not currently use third-party advertising or analytics cookies.
          Authentication uses httpOnly session cookies managed by Supabase.
        </p>
      </ContentSection>

      <ContentSection title="Children">
        <p>
          The service is intended for people at least 13 years old, matching
          the minimum age required to hold a Google account. Users under 18
          should only use Bantay Kalsada with a parent or guardian&apos;s
          permission. We do not knowingly collect data from children under 13.
        </p>
      </ContentSection>

      <ContentSection title="Changes to this policy">
        <p>
          We may update this policy as the service evolves. Material changes
          will be reflected by updating the effective date at the top of this
          page. Continued use of the service after changes constitutes
          acceptance of the updated policy.
        </p>
      </ContentSection>
    </ContentPage>
  );
}
