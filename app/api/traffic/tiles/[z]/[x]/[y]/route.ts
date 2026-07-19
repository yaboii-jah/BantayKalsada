import { NextResponse } from "next/server";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ z: string; x: string; y: string }> },
) {
  const { z, x, y } = await params;
  const apiKey = process.env.TOMTOM_API_KEY;

  if (!apiKey) {
    return new NextResponse("Missing API key", { status: 500 });
  }

  const url = `https://api.tomtom.com/maps/orbis/traffic/flow/raster/tile/${z}/${x}/${y}?apiVersion=2&key=${apiKey}&style=light`;

  const res = await fetch(url);

  if (!res.ok) {
    return new NextResponse("Tile fetch failed", { status: res.status });
  }

  const blob = await res.blob();

  return new NextResponse(blob, {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "public, max-age=300",
    },
  });
}
