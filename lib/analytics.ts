"use client";

import { usePlausible } from "next-plausible";

export type AnalyticsEvents = {
  "Report Submitted": { severity: string; category: string };
  "Report Queued Offline": never;
  "Offline Report Submitted": never;
  "Report Shared": never;
  "Report Flagged": { flagType: string };
  "Comment Added": never;
  "Feedback Submitted": { type: string };
  "Signup": never;
  "Login": never;
  "Report Approved": never;
  "Report Rejected": never;
  "Report Resolved": never;
};

export function useAnalytics() {
  return usePlausible<AnalyticsEvents>();
}
