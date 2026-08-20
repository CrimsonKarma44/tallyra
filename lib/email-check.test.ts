import { describe, expect, it } from "vitest";
import { assertEmailDomain, domainHasMail, type DnsProbe } from "./email-check";

const MX_OK: DnsProbe["resolveMx"] = async () => [{ exchange: "mx.example.com", priority: 10 }];

function probe(overrides: Partial<DnsProbe>): DnsProbe {
  return {
    resolveMx: MX_OK,
    lookup: async () => [{ address: "192.0.2.1", family: 4 }],
    ...overrides,
  };
}

const NOT_FOUND = () => {
  const error = new Error("queryA ENOTFOUND example.com");
  (error as NodeJS.ErrnoException).code = "ENOTFOUND";
  throw error;
};

const TIMEOUT = () => {
  const error = new Error("DNS lookup timed out");
  (error as NodeJS.ErrnoException).code = "ETIMEDOUT";
  throw error;
};

describe("domainHasMail", () => {
  it("accepts a domain with MX records", async () => {
    await expect(domainHasMail("example.com", probe({}))).resolves.toBe(true);
  });

  it("accepts a domain without MX but with address records", async () => {
    await expect(
      domainHasMail("example.com", probe({ resolveMx: async () => [] })),
    ).resolves.toBe(true);
  });

  it("rejects a domain that has neither MX nor addresses", async () => {
    await expect(
      domainHasMail("nope.example", probe({ resolveMx: NOT_FOUND, lookup: NOT_FOUND })),
    ).resolves.toBe(false);
  });

  it("accepts when DNS is transiently unavailable", async () => {
    await expect(
      domainHasMail("example.com", probe({ resolveMx: TIMEOUT, lookup: TIMEOUT })),
    ).resolves.toBe(true);
  });
});

describe("assertEmailDomain", () => {
  it("returns an error for a definitively invalid domain", async () => {
    await expect(
      assertEmailDomain("user@nope.example", probe({ resolveMx: NOT_FOUND, lookup: NOT_FOUND })),
    ).resolves.toMatch(/valid mail server/);
  });

  it("returns null for a valid domain", async () => {
    await expect(assertEmailDomain("user@example.com", probe({}))).resolves.toBeNull();
  });

  it("is a no-op for an address without a domain part", async () => {
    await expect(assertEmailDomain("no-at-sign", probe({}))).resolves.toBeNull();
  });
});