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
  const [resolved, setResolved] = useState(label ?? undefined);

  useEffect(() => {
    if (label) {
      setResolved(label);
      return;
    }
    let cancelled = false;
    reverseGeocode(latitude, longitude).then(({ displayName }) => {
      if (!cancelled && displayName) setResolved(displayName);
    });
    return () => {
      cancelled = true;
    };
  }, [label, latitude, longitude]);

  if (!resolved) return null;

  return (
    <span className={className}>
      {icon}
      {resolved}
    </span>
  );
}
