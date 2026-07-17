import { NextResponse } from "next/server";
import { getTrafficHeatPoints } from "@/lib/tomtom";

export async function GET() {
  try {
    const points = await getTrafficHeatPoints();
    return NextResponse.json({ points });
  } catch {
    return NextResponse.json({ points: [] });
  }
}
