import { describe, expect, it } from "vitest";
import { AUTH_KIND, generateOtp, hashOtp, verifyOtp } from "./otp";

describe("generateOtp", () => {
  it("returns a 6-digit numeric string", () => {
    for (let i = 0; i < 50; i++) {
      const code = generateOtp();
      expect(code).toMatch(/^\d{6}$/);
    }
  });

  it("can produce leading zeros", () => {
    let sawLeadingZero = false;
    for (let i = 0; i < 2000; i++) {
      if (generateOtp().startsWith("0")) {
        sawLeadingZero = true;
        break;
      }
    }
    expect(sawLeadingZero).toBe(true);
  });
});

describe("hashOtp / verifyOtp", () => {
  it("matches the correct code and rejects a wrong one", () => {
    const hash = hashOtp("123456");
    expect(verifyOtp("123456", hash)).toBe(true);
    expect(verifyOtp("654321", hash)).toBe(false);
  });

  it("does not leak a valid code into the hash", () => {
    expect(hashOtp("123456")).not.toContain("123456");
  });
});

describe("AUTH_KIND", () => {
  it("defines the expected token kinds", () => {
    expect(AUTH_KIND.passwordReset).toBe("password-reset");
    expect(AUTH_KIND.emailVerification).toBe("email-verification");
  });
});