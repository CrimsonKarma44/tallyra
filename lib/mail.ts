import dns from "node:dns";
import nodemailer from "nodemailer";

dns.setDefaultResultOrder("ipv4first");

type MailInput = {
  to: string;
  subject: string;
  text: string;
  html: string;
};

const BREVO_URL = "https://api.brevo.com/v3/smtp/email";

export function isMailConfigured(): boolean {
  return Boolean(
    process.env.BREVO_API_KEY ||
      (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS),
  );
}

function parseFrom(): { email: string; name: string } {
  const raw = process.env.MAIL_FROM || process.env.SMTP_FROM || "";
  const match = raw.match(/^\s*(.*?)\s*<([^>]+)>\s*$/);
  if (match) {
    return { name: match[1] || "Tallyra", email: match[2] };
  }
  return { email: raw || process.env.SMTP_USER || "", name: "Tallyra" };
}

async function sendViaBrevo({ to, subject, text, html }: MailInput): Promise<void> {
  const from = parseFrom();
  const response = await fetch(BREVO_URL, {
    method: "POST",
    headers: {
      "api-key": process.env.BREVO_API_KEY!,
      "content-type": "application/json",
      accept: "application/json",
    },
    body: JSON.stringify({
      sender: { email: from.email, name: from.name },
      to: [{ email: to }],
      subject,
      textContent: text,
      htmlContent: html,
    }),
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Brevo API ${response.status}: ${body.slice(0, 200)}`);
  }
}

function smtpTransport() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: /^(true|1)$/i.test(process.env.SMTP_SECURE || ""),
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    connectionTimeout: 15_000,
    greetingTimeout: 15_000,
    socketTimeout: 15_000,
  });
}

export async function sendMail({ to, subject, text, html }: MailInput): Promise<boolean> {
  if (!isMailConfigured()) {
    console.warn(`[mail] not configured; skipping email to ${to}: ${subject}`);
    return false;
  }
  try {
    if (process.env.BREVO_API_KEY) {
      await sendViaBrevo({ to, subject, text, html });
      return true;
    }
    const transport = smtpTransport();
    await transport.sendMail({
      from: process.env.MAIL_FROM || process.env.SMTP_FROM || process.env.SMTP_USER,
      to,
      subject,
      text,
      html,
    });
    return true;
  } catch (error) {
    console.error("[mail] send failed:", error instanceof Error ? error.message : error);
    return false;
  }
}