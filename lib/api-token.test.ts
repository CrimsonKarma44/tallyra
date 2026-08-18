import { afterEach, describe, expect, it } from "vitest";
import { signApiToken, verifyApiToken } from "./api-token";

const ORIGINAL = process.env.SESSION_SECRET;

afterEach(() => {
  process.env.SESSION_SECRET = ORIGINAL;
});

describe("api token", () => {
  it("round-trips a valid token", () => {
    process.env.SESSION_SECRET = "change-this-to-a-long-random-string-32ch";
    const token = signApiToken({ id: "user_1", username: "agent" });
    const payload = verifyApiToken(token);
    expect(payload?.sub).toBe("user_1");
    expect(payload?.username).toBe("agent");
  });

  it("rejects a tampered token", () => {
    process.env.SESSION_SECRET = "change-this-to-a-long-random-string-32ch";
    const token = signApiToken({ id: "user_1", username: "agent" });
    expect(verifyApiToken(`${token}x`)).toBeNull();
  });

  it("rejects an expired token", () => {
    process.env.SESSION_SECRET = "change-this-to-a-long-random-string-32ch";
    const token = signApiToken({ id: "user_1", username: "agent" }, -10);
    expect(verifyApiToken(token)).toBeNull();
  });
});
