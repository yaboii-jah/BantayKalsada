import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { clientIp, enforceApiRateLimit } from "@/lib/api-rate-limit";

const OLD_BASE = "https://app.philsms.com";
const NEW_BASE = "https://dashboard.philsms.com";

async function philsmsHead(baseUrl: string, path: string, token: string) {
  try {
    const res = await fetch(`${baseUrl}${path}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token.trim()}`,
        Accept: "application/json",
      },
      signal: AbortSignal.timeout(10000),
    });
    await res.text();
    return { status: res.status, ok: res.ok };
  } catch {
    return { status: 0, ok: false };
  }
}

export async function GET(request: NextRequest) {
  try {
    const rateLimit = await enforceApiRateLimit(clientIp(request), { hourly: 30 });
    if (rateLimit.limited) {
      return NextResponse.json(
        { success: false, error: "Rate limit exceeded. Try again later." },
        { status: 429 },
      );
    }

    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: "Not authenticated" },
        { status: 401 },
      );
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profile?.role !== "ADMIN") {
      return NextResponse.json(
        { success: false, error: "Admins only" },
        { status: 403 },
      );
    }

    const token = process.env.PHILSMS_API_TOKEN;
    const senderId = process.env.PHILSMS_SENDER_ID;
    const configuredBase = process.env.PHILSMS_API_BASE?.trim() || null;

    if (!token || !senderId) {
      return NextResponse.json({
        success: false,
        error: "PhilSMS is not configured",
        env: {
          hasToken: !!token,
          hasSenderId: !!senderId,
          apiBase: configuredBase,
        },
      });
    }

    const [oldMe, oldBalance, newMe, newBalance] = await Promise.all([
      philsmsHead(OLD_BASE, "/api/v3/me", token),
      philsmsHead(OLD_BASE, "/api/v3/balance", token),
      philsmsHead(NEW_BASE, "/api/v3/me", token),
      philsmsHead(NEW_BASE, "/api/v3/balance", token),
    ]);

    return NextResponse.json({
      success: true,
      configuredApiBase: configuredBase,
      oldSite: { base: OLD_BASE, me: oldMe, balance: oldBalance },
      newSite: { base: NEW_BASE, me: newMe, balance: newBalance },
    });
  } catch {
    return NextResponse.json(
      { success: false, error: "Failed to run SMS diagnostics" },
      { status: 500 },
    );
  }
}
