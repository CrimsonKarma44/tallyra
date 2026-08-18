import { NextResponse } from "next/server";
import { verifyApiToken } from "@/lib/api-token";

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Authorization, Content-Type",
  "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
};

export function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status, headers: corsHeaders });
}

export function options() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

export function bearerToken(request: Request): string | null {
  const header = request.headers.get("authorization") ?? "";
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() || null;
}

export function requireApiUser(request: Request) {
  const token = bearerToken(request);
  if (!token) {
    return { error: json({ error: "Missing bearer token." }, 401) };
  }
  const payload = verifyApiToken(token);
  if (!payload) {
    return { error: json({ error: "Invalid or expired token." }, 401) };
  }
  return { user: { userId: payload.sub, username: payload.username } };
}

export async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    return null;
  }
}
