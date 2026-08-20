import { beforeEach, describe, expect, it } from "vitest";
import { isMailConfigured } from "./mail";

const KEYS = ["BREVO_API_KEY", "SMTP_HOST", "SMTP_USER", "SMTP_PASS"] as const;

beforeEach(() => {
  for (const key of KEYS) {
    delete process.env[key];
  }
});

describe("isMailConfigured", () => {
  it("is false when nothing is configured", () => {
    expect(isMailConfigured()).toBe(false);
  });

  it("is true when Brevo is configured", () => {
    process.env.BREVO_API_KEY = "x";
    expect(isMailConfigured()).toBe(true);
  });

  it("is true when SMTP is fully configured", () => {
    process.env.SMTP_HOST = "smtp.example.com";
    process.env.SMTP_USER = "user";
    process.env.SMTP_PASS = "pass";
    expect(isMailConfigured()).toBe(true);
  });

  it("is false when SMTP is partially configured", () => {
    process.env.SMTP_HOST = "smtp.example.com";
    expect(isMailConfigured()).toBe(false);
  });
});