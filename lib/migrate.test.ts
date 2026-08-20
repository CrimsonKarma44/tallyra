import { describe, expect, it } from "vitest";
import { resolveMigrateSelection } from "./migrate";

describe("resolveMigrateSelection", () => {
  it("treats a blank value as move-all", () => {
    expect(resolveMigrateSelection("")).toEqual({ kind: "all" });
  });

  it("parses a selection of ids", () => {
    expect(resolveMigrateSelection('["a","b"]')).toEqual({
      kind: "selected",
      ids: ["a", "b"],
    });
  });

  it("normalizes and filters non-string ids", () => {
    expect(resolveMigrateSelection('["a",1,null]')).toEqual({
      kind: "selected",
      ids: ["a", "1"],
    });
  });

  it("returns an empty selection for an empty array", () => {
    expect(resolveMigrateSelection("[]")).toEqual({ kind: "selected", ids: [] });
  });

  it("returns an empty selection for malformed json", () => {
    expect(resolveMigrateSelection("not-json")).toEqual({ kind: "selected", ids: [] });
  });
});