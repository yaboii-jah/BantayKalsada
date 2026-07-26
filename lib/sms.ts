const MAX_ATTEMPTS = 3;
const RETRY_DELAY_MS = 1000;

function philsmsEndpoint(): string {
  const base = process.env.PHILSMS_API_BASE?.trim() || "https://app.philsms.com";
  return `${base.replace(/\/+$/, "")}/api/v3/sms/send`;
}

export interface SendSmsResult {
  success: boolean;
  error?: string;
}

/**
 * Normalizes a Philippine mobile number to the international +63 format
 * accepted by PhilSMS. Accepts: 09XXXXXXXXX, 9XXXXXXXXX, +639XXXXXXXXX.
 */
export function normalizePhoneNumber(raw: string): string | null {
  const digits = raw.replace(/[^0-9]/g, "");

  if (digits.startsWith("63") && digits.length === 12) {
    return `+${digits}`;
  }
  if (digits.startsWith("0") && digits.length === 11) {
    return `+63${digits.slice(1)}`;
  }
  if (digits.length === 10) {
    return `+63${digits}`;
  }
  return null;
}

async function attemptSend(phone: string, message: string): Promise<SendSmsResult> {
  const token = process.env.PHILSMS_API_TOKEN;
  const senderId = process.env.PHILSMS_SENDER_ID;

  if (!token || !senderId) {
    return { success: false, error: "PhilSMS is not configured" };
  }

  const res = await fetch(philsmsEndpoint(), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token.trim()}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      recipient: phone,
      sender_id: senderId,
      message,
    }),
  });

  const data = (await res.json().catch(() => null)) as
    | { status?: string; message?: string }
    | null;

  if (!res.ok || !data || data.status !== "success") {
    return {
      success: false,
      error: data?.message ?? `PhilSMS request failed with status ${res.status}`,
    };
  }

  return { success: true };
}

/**
 * Sends an SMS via PhilSMS with up to 3 attempts and a 1s delay between
 * failures. If all attempts fail, the error is returned (caller logs it and
 * continues — SMS delivery never blocks the triggering action).
 */
export async function sendSMS(phone: string, message: string): Promise<SendSmsResult> {
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const result = await attemptSend(phone, message);
      if (result.success) return result;
      if (attempt < MAX_ATTEMPTS) {
        await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
      } else {
        return result;
      }
    } catch (err) {
      const error = err instanceof Error ? err.message : "Unknown PhilSMS error";
      if (attempt < MAX_ATTEMPTS) {
        await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
      } else {
        return { success: false, error };
      }
    }
  }
  return { success: false, error: "PhilSMS send failed after retries" };
}
