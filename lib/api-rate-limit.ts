import { createHash } from "node:crypto";
import { NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/service-role";

const HOURLY_LIMIT = 120;
const DAILY_LIMIT = 1000;
const HOURLY_WINDOW_MS = 60 * 60 * 1000;
const DAILY_WINDOW_MS = 24 * 60 * 60 * 1000;
const RETAIN_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;
const PRUNE_PROBABILITY = 0.01;

function rateLimitSecret(): string {
  return process.env.API_RATE_LIMIT_SECRET?.trim() || "bantay-kalsada-api-rate-limit";
}

/**
 * One-way hash of the client IP so the raw address is never stored.
 * The pepper is server-side only (env API_RATE_LIMIT_SECRET, with a
 * non-secret fallback) to prevent trivial reversal of low-entropy IPs.
 */
export function hashIp(ip: string): string {
  return createHash("sha256").update(`${ip}:${rateLimitSecret()}`).digest("hex");
}

export function clientIp(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const last = forwarded.split(",").pop()?.trim();
    if (last) return last;
  }
  const realIp = request.headers.get("x-real-ip");
  if (realIp) return realIp;
  return "unknown";
}

export interface RateLimitResult {
  limited: boolean;
  retryAfterSeconds?: number;
}

async function oldestInWindow(
  ipHash: string,
  fromIso: string,
): Promise<number | null> {
  const adminClient = createAdminClient();
  const { data } = await adminClient
    .from("api_request_log")
    .select("created_at")
    .eq("ip_hash", ipHash)
    .gte("created_at", fromIso)
    .order("created_at", { ascending: true })
    .limit(1);
  if (!data || data.length === 0) return null;
  return new Date(data[0].created_at).getTime();
}

function retryAfterSeconds(oldestMs: number, windowMs: number, now: number): number {
  return Math.max(1, Math.ceil((oldestMs + windowMs - now) / 1000));
}

/**
 * Sliding-window rate limit for the public REST API: 120 requests/hour and
 * 1,000 requests/day per IP hash. Uses the service-role client (the table has
 * RLS enabled with no policies, so the service role is the only access path).
 * Returns `limited: true` with a `Retry-After` hint when a limit is hit.
 */
export async function enforceApiRateLimit(ip: string): Promise<RateLimitResult> {
  const ipHash = hashIp(ip);
  const now = Date.now();

  const adminClient = createAdminClient();

  if (Math.random() < PRUNE_PROBABILITY) {
    const cutoff = new Date(now - RETAIN_WINDOW_MS).toISOString();
    await adminClient.from("api_request_log").delete().lt("created_at", cutoff);
  }

  const hourlyFrom = new Date(now - HOURLY_WINDOW_MS).toISOString();
  const dailyFrom = new Date(now - DAILY_WINDOW_MS).toISOString();

  const { count: hourlyCount } = await adminClient
    .from("api_request_log")
    .select("id", { count: "exact", head: true })
    .eq("ip_hash", ipHash)
    .gte("created_at", hourlyFrom);

  if ((hourlyCount ?? 0) >= HOURLY_LIMIT) {
    const oldest = await oldestInWindow(ipHash, hourlyFrom);
    return {
      limited: true,
      retryAfterSeconds: oldest
        ? retryAfterSeconds(oldest, HOURLY_WINDOW_MS, now)
        : Math.ceil(HOURLY_WINDOW_MS / 1000),
    };
  }

  const { count: dailyCount } = await adminClient
    .from("api_request_log")
    .select("id", { count: "exact", head: true })
    .eq("ip_hash", ipHash)
    .gte("created_at", dailyFrom);

  if ((dailyCount ?? 0) >= DAILY_LIMIT) {
    const oldest = await oldestInWindow(ipHash, dailyFrom);
    return {
      limited: true,
      retryAfterSeconds: oldest
        ? retryAfterSeconds(oldest, DAILY_WINDOW_MS, now)
        : Math.ceil(DAILY_WINDOW_MS / 1000),
    };
  }

  await adminClient.from("api_request_log").insert({ ip_hash: ipHash });

  return { limited: false };
}
