"use client";

import { useEffect, useRef, useState } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { getDisplayUrl } from "@/lib/cloudinary-url";
import { formatReportDate } from "@/lib/date-utils";

interface NearbyReport {
  id: string;
  title: string;
  category: string;
  severity: string;
  photo_urls: string[];
  latitude: number;
  longitude: number;
  location_label: string | null;
  submitted_at: string;
  distance_m: number;
}

const severityConfig: Record<string, { label: string; color: string }> = {
  MINOR: { label: "Minor", color: "#22c55e" },
  URGENT: { label: "Urgent", color: "#eab308" },
  EMERGENCY: { label: "Emergency", color: "#ef4444" },
};

interface NearbyReportsLayerProps {
  lat: number | null;
  lng: number | null;
}

export function NearbyReportsLayer({ lat, lng }: NearbyReportsLayerProps) {
  const map = useMap();
  const layerRef = useRef<L.LayerGroup | null>(null);
  const [reports, setReports] = useState<NearbyReport[]>([]);
  const supabaseRef = useRef(createSupabaseBrowserClient());

  useEffect(() => {
    if (lat === null || lng === null) return;

    let cancelled = false;

    supabaseRef.current
      .rpc("get_nearby_reports", { lat, lng, max_distance_m: 200 })
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) {
          console.error("Failed to fetch nearby reports:", error);
          return;
        }
        setReports((data as NearbyReport[]) ?? []);
      });

    return () => {
      cancelled = true;
    };
  }, [lat, lng]);

  useEffect(() => {
    if (!layerRef.current) {
      layerRef.current = L.layerGroup().addTo(map);
    }

    const layer = layerRef.current;
    layer.clearLayers();

    if (lat !== null && lng !== null) {
      for (const report of reports) {
        const config = severityConfig[report.severity] ?? severityConfig.MINOR;
        const distance = report.distance_m < 1
          ? "<1m"
          : `${Math.round(report.distance_m)}m`;

        const chipHtml = `
        <div style="
          display: inline-flex;
          align-items: center;
          gap: 3px;
          padding: 2px 8px;
          border-radius: 999px;
          border: 1.5px solid ${config.color};
          background: white;
          box-shadow: 0 1px 3px rgba(0,0,0,0.15);
          font-size: 11px;
          font-weight: 500;
          line-height: 1.4;
          white-space: nowrap;
          color: #1f2937;
        ">
          <span style="
            display: inline-block;
            width: 6px;
            height: 6px;
            border-radius: 50%;
            background: ${config.color};
            flex-shrink: 0;
          "></span>
          ${distance}
        </div>
      `;

        const marker = L.marker([report.latitude, report.longitude], {
          icon: L.divIcon({
            html: chipHtml,
            className: "",
            iconAnchor: [40, 14],
            iconSize: [80, 28],
          }),
          interactive: true,
        });

        const photoHtml = report.photo_urls[0]
          ? `<img src="${getDisplayUrl(report.photo_urls[0])}" alt="${report.title}" style="margin-bottom: 6px; width: 100%; height: 80px; border-radius: 4px; object-fit: cover;" />`
          : "";

        marker.bindPopup(`
        <div style="min-width: 200px;">
          ${photoHtml}
          <p style="margin: 0 0 4px; font-size: 13px; font-weight: 600; line-height: 1.3;">${report.title}</p>
          <div style="display: flex; flex-wrap: wrap; gap: 4px; margin-bottom: 4px;">
            <span style="display: inline-flex; align-items: center; border-radius: 4px; padding: 1px 6px; font-size: 10px; font-weight: 500; background: ${config.color}20; color: ${config.color}; border: 1px solid ${config.color}40;">
              ${config.label}
            </span>
            <span style="display: inline-flex; align-items: center; border-radius: 4px; padding: 1px 6px; font-size: 10px; font-weight: 500; background: #3b82f610; color: #2563eb; border: 1px solid #3b82f620;">
              APPROVED
            </span>
          </div>
          <p style="margin: 0; font-size: 11px; color: #6b7280;">
            ${distance} away &middot; ${formatReportDate(report.submitted_at)}
          </p>
          <a href="/reports/${report.id}" target="_blank" rel="noopener noreferrer"
            style="display: inline-block; margin-top: 6px; font-size: 11px; color: #2563eb; text-decoration: underline;">
            View full details →
          </a>
        </div>
      `);

        layer.addLayer(marker);
      }
    }

    return () => {
      layer.clearLayers();
    };
  }, [reports, lat, lng, map]);

  return null;
}
