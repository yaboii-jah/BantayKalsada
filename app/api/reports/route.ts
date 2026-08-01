import { NextRequest, NextResponse } from "next/server";
import { listReportsQuerySchema } from "@/lib/validations/api";
import { fetchPublicReports } from "@/lib/api-reports";
import { enforceApiRateLimit, clientIp } from "@/lib/api-rate-limit";

const CORS_HEADERS = { "Access-Control-Allow-Origin": "*" };
const CACHE_HEADERS = {
  "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
  ...CORS_HEADERS,
};

export async function GET(request: NextRequest) {
  const raw: Record<string, string> = {};
  const url = new URL(request.url);
  url.searchParams.forEach((value, key) => {
    if (value !== "") raw[key] = value;
  });

  const parsed = listReportsQuerySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: "Invalid query parameters." },
      { status: 400, headers: CORS_HEADERS },
    );
  }

  const rate = await enforceApiRateLimit(clientIp(request));
  if (rate.limited) {
    return NextResponse.json(
      { success: false, error: "Rate limit exceeded. Please try again later." },
      {
        status: 429,
        headers: { ...CORS_HEADERS, "Retry-After": String(rate.retryAfterSeconds ?? 3600) },
      },
    );
  }

  try {
    const data = await fetchPublicReports(parsed.data);
    return NextResponse.json(
      { success: true, data },
      { status: 200, headers: CACHE_HEADERS },
    );
  } catch {
    return NextResponse.json(
      { success: false, error: "Failed to fetch reports" },
      { status: 500, headers: CORS_HEADERS },
    );
  }
}
