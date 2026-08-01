import { NextRequest, NextResponse } from "next/server";
import { reportParamsSchema } from "@/lib/validations/api";
import { fetchPublicReportById } from "@/lib/api-reports";
import { enforceApiRateLimit, clientIp } from "@/lib/api-rate-limit";

const CORS_HEADERS = { "Access-Control-Allow-Origin": "*" };
const CACHE_HEADERS = {
  "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
  ...CORS_HEADERS,
};

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const parsed = reportParamsSchema.safeParse({ id });
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: "Invalid report id." },
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
    const report = await fetchPublicReportById(parsed.data.id);
    if (!report) {
      return NextResponse.json(
        { success: false, error: "Report not found" },
        { status: 404, headers: CORS_HEADERS },
      );
    }
    return NextResponse.json(
      { success: true, data: report },
      { status: 200, headers: CACHE_HEADERS },
    );
  } catch {
    return NextResponse.json(
      { success: false, error: "Failed to fetch report" },
      { status: 500, headers: CORS_HEADERS },
    );
  }
}
