import type { Metadata } from "next";
import { ContentPage, ContentSection, ContentList } from "@/components/public/content-page";

export const metadata: Metadata = {
  title: "Disclaimer | Bantay Kalsada",
  description:
    "Bantay Kalsada is a community platform, not an official government service. Read the disclaimer about report accuracy and emergencies.",
};

export default function DisclaimerPage() {
  return (
    <ContentPage
      title="Disclaimer"
      intro="Please read this disclaimer carefully before relying on any information on Bantay Kalsada."
    >
      <ContentSection title="Citizen-supplied information">
        <p>
          All reports on Bantay Kalsada are submitted by community members and
          have not been independently verified. Reports may be inaccurate,
          incomplete, out of date, or mistaken in their location, category, or
          severity. Treat every report as unverified information.
        </p>
      </ContentSection>

      <ContentSection title="Not an official service">
        <p>
          Bantay Kalsada is a community project and is not affiliated with,
          endorsed by, or operated by the municipal government of Taytay or any
          government agency. Information published here does not constitute an
          official record, alert, or advisory.
        </p>
      </ContentSection>

      <ContentSection title="Not for emergencies">
        <p>
          Bantay Kalsada is not an emergency response service. For emergencies,
          road accidents, fires, or threats to life and property, contact the
          proper authorities immediately.
        </p>
        <ContentList
          items={[
            <span key="1"><strong className="text-foreground">Emergency hotline:</strong> 911</span>,
            <span key="2"><strong className="text-foreground">Philippine National Police:</strong> 122</span>,
          ]}
        />
      </ContentSection>

      <ContentSection title="Use at your own risk">
        <p>
          Road conditions change quickly. Always verify conditions yourself
          before relying on a report to make driving or travel decisions. You
          use Bantay Kalsada and act on its content at your own risk.
        </p>
      </ContentSection>

      <ContentSection title="No liability">
        <p>
          To the fullest extent permitted by law, Bantay Kalsada and its
          administrators are not liable for any loss, injury, or damage arising
          from reliance on content published on this platform, or from the use
          of the service in any way.
        </p>
      </ContentSection>

      <ContentSection title="Moderation does not imply verification">
        <p>
          Approval of a report by an administrator confirms it follows the{" "}
          <span className="font-medium text-foreground">Community Guidelines</span>,
          not that the information is factually true at the time you view it.
        </p>
      </ContentSection>
    </ContentPage>
  );
}
