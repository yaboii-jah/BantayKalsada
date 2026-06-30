const formatter = new Intl.DateTimeFormat("fil-PH", {
  year: "numeric",
  month: "long",
  day: "numeric",
});

const RELATIVE_UNITS: Array<{ label: string; ms: number }> = [
  { label: "minute", ms: 60_000 },
  { label: "hour", ms: 3_600_000 },
  { label: "day", ms: 86_400_000 },
];

export function formatReportDate(isoString: string): string {
  const now = Date.now();
  const date = new Date(isoString).getTime();
  const diff = now - date;

  if (diff < 0) return formatter.format(new Date(isoString));

  if (diff < RELATIVE_UNITS[0].ms * 2) return "Just now";

  for (const unit of RELATIVE_UNITS) {
    if (diff < unit.ms) {
      const count = Math.floor(diff / (unit.ms / 60_000));
      return `${count} ${unit.label}${count > 1 ? "s" : ""} ago`;
    }
  }

  const days = Math.floor(diff / RELATIVE_UNITS[2].ms);
  if (days < 1) {
    const hours = Math.floor(diff / RELATIVE_UNITS[1].ms);
    return `${hours} ${hours > 1 ? "hours" : "hour"} ago`;
  }

  return formatter.format(new Date(isoString));
}
