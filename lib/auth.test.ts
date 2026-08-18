import { describe, expect, it } from "vitest";
import {
  normalizeUsername,
  validateDisplayName,
  validateOrgName,
  validatePassword,
  validateUsername,
} from "./auth";

describe("validateUsername", () => {
  it("accepts a simple agent name", () => {
    expect(validateUsername("agent_01")).toBeNull();
  });

  it("rejects a blank name", () => {
    expect(validateUsername("")).toMatch(/required/);
  });

  it("rejects names that are too short", () => {
    expect(validateUsername("ab")).toMatch(/3–32/);
  });

  it("rejects spaces and symbols", () => {
    expect(validateUsername("bad name")).toMatch(/letters/);
  });
});

describe("validatePassword", () => {
  it("accepts 8 or more characters", () => {
    expect(validatePassword("password")).toBeNull();
  });

  it("rejects short passwords", () => {
    expect(validatePassword("short")).toMatch(/8 characters/);
  });
});

describe("normalizeUsername", () => {
  it("trims surrounding space", () => {
    expect(normalizeUsername("  maria  ")).toBe("maria");
  });
});

describe("validateDisplayName", () => {
  it("accepts a short name", () => {
    expect(validateDisplayName("Maria Santos")).toBeNull();
  });

  it("rejects names longer than 40 characters", () => {
    expect(validateDisplayName("x".repeat(41))).toMatch(/40 characters/);
  });
});

describe("validateOrgName", () => {
  it("accepts a simple org name", () => {
    expect(validateOrgName("San Isidro Store")).toBeNull();
  });

  it("rejects a blank name", () => {
    expect(validateOrgName("")).toMatch(/required/);
  });

  it("rejects symbols", () => {
    expect(validateOrgName("Bayan@Store")).toMatch(/3–40/);
  });
});
