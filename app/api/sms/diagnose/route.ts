import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const OLD_BASE = "https://app.philsms.com";
const NEW_BASE = "https://dashboard.philsms.com";

async function philsmsGet(baseUrl: string, path: string, token: string) {
  const url = `${baseUrl}${path}`;
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token.trim()}`,
      Accept: "application/json",
    },
  });
  const body = await res.json().catch(() => null);
  return { status: res.status, body };
}

export async function GET() {
  try {
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
          tokenLength: token?.length ?? 0,
          senderIdLength: senderId?.length ?? 0,
          apiBase: configuredBase,
        },
      });
    }

    const tokenPreview = token.trim().slice(0, 6) + "..." + token.trim().slice(-4);

    const [oldMe, oldBalance, newMe, newBalance] = await Promise.all([
      philsmsGet(OLD_BASE, "/api/v3/me", token),
      philsmsGet(OLD_BASE, "/api/v3/balance", token),
      philsmsGet(NEW_BASE, "/api/v3/me", token),
      philsmsGet(NEW_BASE, "/api/v3/balance", token),
    ]);

    return NextResponse.json({
      success: true,
      tokenPreview,
      tokenLength: token.length,
      tokenTrimmedLength: token.trim().length,
      configuredApiBase: configuredBase,
      oldSite: { base: OLD_BASE, me: oldMe, balance: oldBalance },
      newSite: { base: NEW_BASE, me: newMe, balance: newBalance },
    });
  } catch (err) {
    return NextResponse.json(
      {
        success: false,
        error: err instanceof Error ? err.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}