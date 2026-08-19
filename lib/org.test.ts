import { describe, expect, it } from "vitest";
import { initialOrgEmailVerifiedAt } from "./org";

const now = new Date();

describe("initialOrgEmailVerifiedAt", () => {
  it("auto-verifies when SMTP is not configured", () => {
    expect(
      initialOrgEmailVerifiedAt({
        smtpConfigured: false,
        orgEmail: "company@example.com",
        adminEmail: "person@example.com",
        adminVerifiedAt: null,
      }),
    ).toBeInstanceOf(Date);
  });

  it("inherits the admin's verification when the org email is the same address", () => {
    expect(
      initialOrgEmailVerifiedAt({
        smtpConfigured: true,
        orgEmail: "person@example.com",
        adminEmail: "person@example.com",
        adminVerifiedAt: now,
      }),
    ).toBe(now);
  });

  it("stays unverified for a same-email org whose admin never verified", () => {
    expect(
      initialOrgEmailVerifiedAt({
        smtpConfigured: true,
        orgEmail: "person@example.com",
        adminEmail: "person@example.com",
        adminVerifiedAt: null,
      }),
    ).toBeNull();
  });

  it("starts unverified for a brand-new organization email", () => {
    expect(
      initialOrgEmailVerifiedAt({
        smtpConfigured: true,
        orgEmail: "company@example.com",
        adminEmail: "person@example.com",
        adminVerifiedAt: now,
      }),
    ).toBeNull();
  });

  it("stays unverified when the org has no email", () => {
    expect(
      initialOrgEmailVerifiedAt({
        smtpConfigured: true,
        orgEmail: null,
        adminEmail: "person@example.com",
        adminVerifiedAt: now,
      }),
    ).toBeNull();
  });
});