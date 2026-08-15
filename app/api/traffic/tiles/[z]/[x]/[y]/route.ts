import { NextRequest, NextResponse } from "next/server";
import { clientIp, enforceApiRateLimit } from "@/lib/api-rate-limit";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ z: string; x: string; y: string }> },
) {
  const { z, x, y } = await params;
  const zNum = Number(z);
  const xNum = Number(x);
  const yNum = Number(y);
  const maxCoord = Math.pow(2, zNum);

  if (
    !Number.isInteger(zNum) ||
    zNum < 0 ||
    zNum > 20 ||
    !Number.isInteger(xNum) ||
    !Number.isInteger(yNum) ||
    xNum < 0 ||
    yNum < 0 ||
    xNum >= maxCoord ||
    yNum >= maxCoord
  ) {
    return new NextResponse("Invalid tile coordinates", { status: 400 });
  }

  const rateLimit = await enforceApiRateLimit(clientIp(request), {
    hourly: 7200,
    daily: 50000,
  });

  if (rateLimit.limited) {
    return new NextResponse("Rate limit exceeded", {
      status: 429,
      headers: { "Retry-After": String(rateLimit.retryAfterSeconds ?? 60) },
    });
  }

  const apiKey = process.env.TOMTOM_API_KEY;

  if (!apiKey) {
    return new NextResponse("Missing API key", { status: 500 });
  }

  const url = `https://api.tomtom.com/maps/orbis/traffic/flow/raster/tile/${zNum}/${xNum}/${yNum}?apiVersion=2&key=${apiKey}&style=light`;

  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) {
      return new NextResponse("Tile fetch failed", { status: res.status });
    }

    const blob = await res.blob();

    return new NextResponse(blob, {
      headers: {
        "Content-Type": "image/png",
        "Cache-Control":
          "public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400",
      },
    });
  } catch {
    return new NextResponse("Tile fetch failed", { status: 504 });
  }
}
