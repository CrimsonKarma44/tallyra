import { describe, expect, it } from "vitest";
import { apiErrorMessage } from "./scan-receipt";

describe("apiErrorMessage", () => {
  it("never leaks JSON-shaped raw errors", () => {
    const json = '{"error":{"code":400,"message":"Invalid request","status":"INVALID_ARGUMENT"}}';
    expect(apiErrorMessage(new Error(json))).toBe(
      "Receipt scanning is unavailable at the moment. Try again in a few minutes.",
    );
  });

  it("never leaks unknown raw messages", () => {
    expect(apiErrorMessage(new Error("fetch failed connecting to 142.250.72.108:443"))).toBe(
      "Receipt scanning is unavailable at the moment. Try again in a few minutes.",
    );
  });

  it("maps an invalid API key to the key hint", () => {
    expect(apiErrorMessage(new Error("API key not valid. Please pass a valid API key."))).toMatch(
      /API key/,
    );
  });

  it("maps quota exhaustion to the quota hint", () => {
    expect(apiErrorMessage(new Error("RESOURCE_EXHAUSTED: 429 Quota exceeded"))).toMatch(/quota/i);
  });

  it("maps an unknown model to the model hint", () => {
    expect(
      apiErrorMessage(new Error("404 model gemini-bogus not found")),
    ).toMatch(/model is not available/i);
  });

  it("falls back to the generic message for non-errors", () => {
    expect(apiErrorMessage(null)).toBe(
      "Receipt scanning is unavailable at the moment. Try again in a few minutes.",
    );
  });
});