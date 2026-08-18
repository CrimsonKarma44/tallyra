import { createHmac, timingSafeEqual } from "node:crypto";

export type ApiTokenPayload = {
  sub: string;
  username: string;
  exp: number;
};

const DEFAULT_TTL_SECONDS = 7 * 24 * 60 * 60;

function secret(): string {
  const value = process.env.SESSION_SECRET;
  if (!value || value.length < 32) {
    throw new Error("SESSION_SECRET must be set to at least 32 characters.");
  }
  return value;
}

function sign(body: string): string {
  return createHmac("sha256", secret()).update(body).digest("base64url");
}

export function signApiToken(
  user: { id: string; username: string },
  ttlSeconds = DEFAULT_TTL_SECONDS,
): string {
  const payload: ApiTokenPayload = {
    sub: user.id,
    username: user.username,
    exp: Math.floor(Date.now() / 1000) + ttlSeconds,
  };
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${body}.${sign(body)}`;
}

export function verifyApiToken(token: string): ApiTokenPayload | null {
  const [body, signature] = token.split(".");
  if (!body || !signature) {
    return null;
  }
  const expected = sign(body);
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return null;
  }
  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as ApiTokenPayload;
    if (!payload.sub || !payload.username || typeof payload.exp !== "number") {
      return null;
    }
    if (payload.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}
