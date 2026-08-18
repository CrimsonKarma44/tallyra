import { describe, expect, it } from "vitest";
import { normalizeUsername, validatePassword, validateUsername } from "./auth";

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
