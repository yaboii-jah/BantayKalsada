const formatter = new Intl.DateTimeFormat("fil-PH", {
  year: "numeric",
  month: "long",
  day: "numeric",
});

export function formatReportDate(isoString: string): string {
  const now = Date.now();
  const date = new Date(isoString).getTime();
  const diff = now - date;

  if (diff < 0 || Number.isNaN(diff)) return formatter.format(new Date(isoString));
  if (diff < 60_000) return "Just now";

  const minutes = Math.floor(diff / 60_000);
  if (minutes < 60) return `${minutes} minute${minutes > 1 ? "s" : ""} ago`;

  const hours = Math.floor(diff / 3_600_000);
  if (hours < 24) return `${hours} hour${hours > 1 ? "s" : ""} ago`;

  const days = Math.floor(diff / 86_400_000);
  if (days < 30) return `${days} day${days > 1 ? "s" : ""} ago`;

  return formatter.format(new Date(isoString));
}
