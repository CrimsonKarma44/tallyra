import dns from "node:dns";

export type DnsProbe = {
  resolveMx: (domain: string) => Promise<Array<{ exchange: string; priority: number }>>;
  lookup: (domain: string) => Promise<Array<{ address: string; family: number }>>;
};

const LOOKUP_TIMEOUT_MS = 3000;

const DEFINITE_CODES = new Set([
  "ENOTFOUND",
  "ENODATA",
  "EAI_NODATA",
  "EAI_NONAME",
  "NOTFOUND",
  "NODATA",
]);

function isDefiniteError(error: unknown): boolean {
  const code = (error as NodeJS.ErrnoException | null)?.code;
  return typeof code === "string" && DEFINITE_CODES.has(code);
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("DNS lookup timed out")), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

const defaultProbe: DnsProbe = {
  resolveMx: (domain) => dns.promises.resolveMx(domain),
  lookup: (domain) => dns.promises.lookup(domain, { all: true }),
};

/**
 * Best-effort check that an email's domain can receive mail. Returns false only
 * when the domain definitively has no mail server (no MX and no address
 * records). Any DNS hiccup or timeout is treated as valid so real users are
 * never blocked; final deliverability is still enforced by OTP verification.
 */
export async function domainHasMail(domain: string, probe: DnsProbe = defaultProbe): Promise<boolean> {
  try {
    const mx = await withTimeout(probe.resolveMx(domain), LOOKUP_TIMEOUT_MS);
    if (mx.length > 0) {
      return true;
    }
  } catch {
    // fall through to the address lookup below
  }
  try {
    const addresses = await withTimeout(probe.lookup(domain), LOOKUP_TIMEOUT_MS);
    return addresses.length > 0;
  } catch (error) {
    return !isDefiniteError(error);
  }
}

export async function assertEmailDomain(email: string, probe: DnsProbe = defaultProbe): Promise<string | null> {
  const at = email.lastIndexOf("@");
  const domain = at >= 0 ? email.slice(at + 1).trim().toLowerCase() : "";
  if (!domain) {
    return null;
  }
  const ok = await domainHasMail(domain, probe);
  return ok
    ? null
    : `We couldn't find a valid mail server for ${domain}. Check the address and try again.`;
}