import { ImageResponse } from "next/og";
import { BrandCard, OG_IMAGE_SIZE } from "@/lib/og-image";

export const alt = "Bantay Kalsada — Report road hazards and help keep your community safe.";
export const size = OG_IMAGE_SIZE;
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(<BrandCard />, {
    ...size,
  });
}
