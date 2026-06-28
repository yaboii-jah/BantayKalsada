import { ShieldCheck } from "lucide-react";

const highlights = [
  "Report road hazards in seconds",
  "Track the status of your reports",
  "Get notified when issues are resolved",
];

export function BrandingPanel() {
  return (
    <div className="flex h-full flex-col justify-center gap-6 bg-gradient-to-br from-primary/5 via-primary/[0.02] to-primary/10 p-8">
      <div className="flex items-center gap-3">
        <div className="flex size-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <ShieldCheck className="size-5" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-foreground">
            Bantay Kalsada
          </h2>
        </div>
      </div>

      <div>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Help keep your community safe. Report road hazards, track
          resolutions, and stay informed about issues that matter to you.
        </p>
      </div>

      <ul className="space-y-2">
        {highlights.map((item) => (
          <li key={item} className="flex items-start gap-2 text-sm text-foreground/80">
            <span className="mt-0.5 text-primary">—</span>
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}
