import { BrevoClient } from "@getbrevo/brevo";

let client: BrevoClient | null = null;

function getBrevoClient(): BrevoClient {
  if (!client) {
    const apiKey = process.env.BREVO_API_KEY;
    if (!apiKey) {
      throw new Error("BREVO_API_KEY environment variable is not set");
    }
    client = new BrevoClient({ apiKey });
  }
  return client;
}

export interface SendEmailParams {
  to: string;
  toName?: string;
  subject: string;
  htmlContent: string;
}

export async function sendStatusEmail(params: SendEmailParams): Promise<void> {
  const { to, toName, subject, htmlContent } = params;

  const brevo = getBrevoClient();

  await brevo.transactionalEmails.sendTransacEmail({
    to: [{ email: to, name: toName }],
    subject,
    htmlContent,
    sender: {
      email: process.env.BREVO_SENDER_EMAIL ?? "jahmelldorias17@gmail.com",
      name: "Bantay Kalsada",
    },
  });
}
