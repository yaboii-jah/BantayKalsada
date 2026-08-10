"use client";

import { useEffect, useState, type ReactNode } from "react";
import { reverseGeocode } from "@/lib/geocode";

export function LocationLabel({
  label,
  latitude,
  longitude,
  className,
  icon,
}: {
  label?: string | null;
  latitude: number;
  longitude: number;
  className?: string;
  icon?: ReactNode;
}) {
  const [geocoded, setGeocoded] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (label) return;
    let cancelled = false;
    reverseGeocode(latitude, longitude).then(({ displayName }) => {
      if (!cancelled && displayName) setGeocoded(displayName);
    });
    return () => {
      cancelled = true;
    };
  }, [label, latitude, longitude]);

  const resolved = label ?? geocoded;
  if (!resolved) return null;

  return (
    <span className={className}>
      {icon}
      {resolved}
    </span>
  );
}
