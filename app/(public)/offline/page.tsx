import type { Metadata } from "next";

import { OfflinePage } from "@/components/offline/offline-page";

export const metadata: Metadata = {
  title: "You're offline — Bantay Kalsada",
  robots: {
    index: false,
    follow: false,
  },
};

export default function OfflineRoutePage() {
  return <OfflinePage />;
}
