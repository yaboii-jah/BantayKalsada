import type { Metadata } from "next";
import { ContentPage, ContentSection, ContentList } from "@/components/public/content-page";

export const metadata: Metadata = {
  title: "Community Guidelines | Bantay Kalsada",
  description:
    "The rules for reporting road hazards on Bantay Kalsada — what to report, how to report accurately, and what makes a good report.",
};

export default function GuidelinesPage() {
  return (
    <ContentPage
      title="Community Guidelines"
      intro="These guidelines keep Bantay Kalsada useful, accurate, and respectful for the whole Taytay community."
    >
      <ContentSection title="What to report">
        <p>Reports should describe road hazards within Taytay, Rizal. Categories include:</p>
        <ContentList
          items={[
            <span key="1"><strong className="text-foreground">Pothole</strong> — damaged road surface, sunken or broken pavement.</span>,
            <span key="2"><strong className="text-foreground">Flooded road</strong> — standing water on or blocking the roadway.</span>,
            <span key="3"><strong className="text-foreground">Road accident</strong> — collisions, debris, or aftermath affecting traffic.</span>,
            <span key="4"><strong className="text-foreground">Road rage</strong> — incidents involving aggressive driving.</span>,
            <span key="5"><strong className="text-foreground">Other</strong> — broken streetlights, missing signs, fallen trees, and similar hazards.</span>,
          ]}
        />
        <p>
          Only report hazards you have personally observed. Do not submit
          rumors, hearsay, or events you did not witness.
        </p>
      </ContentSection>

      <ContentSection title="How to write a good report">
        <ContentList
          items={[
            <span key="1"><strong className="text-foreground">Clear title</strong> — describe what and where, e.g. &quot;Deep pothole near San Juan bridge, right lane.&quot;</span>,
            <span key="2"><strong className="text-foreground">Specific description</strong> — at least 20 characters: size, exact spot, which lane, when you saw it, and how severe it is.</span>,
            <span key="3"><strong className="text-foreground">Pick a severity level</strong> — MINOR, URGENT, or EMERGENCY.</span>,
            <span key="4"><strong className="text-foreground">Choose the correct barangay</strong> — one of Dolores, San Isidro, San Juan, Santa Ana, or Muzon.</span>,
            <span key="5"><strong className="text-foreground">Pin the exact location</strong> — the map pin must fall within Taytay&apos;s municipal boundary.</span>,
          ]}
        />
      </ContentSection>

      <ContentSection title="Photo rules">
        <ContentList
          items={[
            <span key="1">Include between 1 and 3 photos — at least one is required.</span>,
            <span key="2">Use photos you took yourself. Do not download or reuse others&apos; images.</span>,
            <span key="3">Avoid close-ups of identifiable people. Do not photograph faces without consent.</span>,
            <span key="4">No NSFW, graphic, violent, or sensitive content.</span>,
            <span key="5">Photos are public once a report is approved — consider privacy before uploading.</span>,
          ]}
        />
      </ContentSection>

      <ContentSection title="Be respectful">
        <ContentList
          items={[
            <span key="1">Comments and reports must stay respectful — no harassment, hate speech, or personal attacks.</span>,
            <span key="2">Do not share others&apos; personal information (doxxing).</span>,
            <span key="3">Do not spam, self-promote, or post off-topic content.</span>,
            <span key="4">Keep it factual. Speculation belongs in the description, clearly marked as such.</span>,
          ]}
        />
      </ContentSection>

      <ContentSection title="Flagging">
        <p>
          If you think a report is already fixed or pinned to the wrong
          location, use the{" "}
          <strong className="text-foreground">Already fixed</strong> or{" "}
          <strong className="text-foreground">Wrong location</strong> flag on
          the report page instead of posting a comment.
        </p>
      </ContentSection>

      <ContentSection title="Enforcement">
        <p>
          Reports are reviewed by administrators and can be rejected with a
          reason. Content that violates these guidelines may be removed, and
          repeat violations may lead to suspension of your account.
        </p>
      </ContentSection>
    </ContentPage>
  );
}
