import dns from "node:dns";
import nodemailer from "nodemailer";

dns.setDefaultResultOrder("ipv4first");

type MailInput = {
  to: string;
  subject: string;
  text: string;
  html: string;
};

export function isMailConfigured(): boolean {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
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
    console.warn(`[mail] SMTP not configured; skipping email to ${to}: ${subject}`);
    return false;
  }
  try {
    const transport = smtpTransport();
    await transport.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
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