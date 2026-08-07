import type { Metadata } from "next";
import Link from "next/link";
import { ContentPage, ContentSection, ContentList } from "@/components/public/content-page";

export const metadata: Metadata = {
  title: "Terms of Service | Bantay Kalsada",
  description:
    "The terms and conditions that govern your use of Bantay Kalsada, the community road hazard reporting platform for Taytay, Rizal.",
};

const CONTACT_EMAIL = "jahmelldorias17@gmail.com";

export default function TermsPage() {
  return (
    <ContentPage
      title="Terms of Service"
      intro="Effective date: August 8, 2026. By creating an account or using Bantay Kalsada, you agree to these terms."
    >
      <ContentSection title="Eligibility">
        <ContentList
          items={[
            <span key="1">
              You must be at least <strong className="text-foreground">13 years old</strong>{" "}
              to use Bantay Kalsada, matching the minimum age required for a
              Google account.
            </span>,
            <span key="2">
              If you are under 18, you may only use the service with the
              permission and supervision of a parent or guardian.
            </span>,
            <span key="3">Anyone under 13 may not use the service.</span>,
          ]}
        />
      </ContentSection>

      <ContentSection title="Your account">
        <p>
          You are responsible for maintaining the confidentiality of your
          account and for all activity that occurs under it. You agree to
          provide accurate information when creating your account.
        </p>
      </ContentSection>

      <ContentSection title="Acceptable use">
        <p>
          When using Bantay Kalsada, you agree not to:
        </p>
        <ContentList
          items={[
            <span key="1">Submit reports you know to be false, misleading, or fabricated.</span>,
            <span key="2">Upload content that is unlawful, defamatory, harassing, hateful, violent, or sexually explicit.</span>,
            <span key="3">Share other people&apos;s personal information without their consent.</span>,
            <span key="4">Impersonate any person or entity.</span>,
            <span key="5">Attempt to disrupt, abuse, or interfere with the service or its rate limits.</span>,
          ]}
        />
      </ContentSection>

      <ContentSection title="Submitting reports">
        <p>
          Reports must relate to road hazards within Taytay, Rizal, and include
          between one and three photos and a pinned location inside Taytay&apos;s
          municipal boundary. By submitting a report, you confirm that the
          content is your own and that you believe the report is accurate. You
          retain ownership of your content and grant Bantay Kalsada a
          non-exclusive, royalty-free license to store and publicly display it
          as part of the service.
        </p>
      </ContentSection>

      <ContentSection title="Moderation">
        <p>
          All reports are reviewed by administrators. Reports may be approved,
          rejected (with a reason), or marked resolved. We aim to act on every
          report within 48 hours but do not guarantee a specific review time.
          We may remove content or reject reports that violate these terms.
        </p>
      </ContentSection>

      <ContentSection title="Disclaimer of warranties">
        <p>
          Bantay Kalsada is provided &quot;as is&quot; and &quot;as
          available&quot; without warranties of any kind. Reports are
          citizen-supplied and unverified; we do not guarantee their accuracy,
          completeness, or timeliness. See the{" "}
          <Link
            href="/disclaimer"
            className="font-medium text-primary underline-offset-2 hover:underline"
          >
            Disclaimer
          </Link>{" "}
          for details.
        </p>
      </ContentSection>

      <ContentSection title="Limitation of liability">
        <p>
          To the maximum extent permitted by law, Bantay Kalsada and its
          administrators shall not be liable for any indirect, incidental,
          special, or consequential damages arising from your use of the
          service or reliance on its content.
        </p>
      </ContentSection>

      <ContentSection title="Termination">
        <p>
          We may suspend or terminate access to the service for users who
          violate these terms. You may stop using the service at any time.
        </p>
      </ContentSection>

      <ContentSection title="Changes to these terms">
        <p>
          We may update these terms as the service evolves. Material changes
          will be reflected by updating the effective date. Continued use of
          the service after changes constitutes acceptance.
        </p>
      </ContentSection>

      <ContentSection title="Governing law">
        <p>
          These terms are governed by the laws of the Republic of the
          Philippines. Questions about these terms can be sent to{" "}
          <a
            href={`mailto:${CONTACT_EMAIL}`}
            className="font-medium text-primary underline-offset-2 hover:underline"
          >
            {CONTACT_EMAIL}
          </a>
          .
        </p>
      </ContentSection>
    </ContentPage>
  );
}
