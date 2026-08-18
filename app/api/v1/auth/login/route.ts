import { signApiToken } from "@/lib/api-token";
import { json, options, readJson } from "@/lib/api-http";
import { normalizeUsername, verifyCredentials } from "@/lib/auth";

export function OPTIONS() {
  return options();
}

export async function POST(request: Request) {
  const body = (await readJson(request)) as { username?: string; password?: string } | null;
  const username = normalizeUsername(String(body?.username ?? ""));
  const password = String(body?.password ?? "");
  if (!username || !password) {
    return json({ error: "Username and password are required." }, 400);
  }
  const user = await verifyCredentials(username, password);
  if (!user) {
    return json({ error: "Invalid username or password." }, 401);
  }
  const token = signApiToken(user);
  return json({ token, tokenType: "Bearer", username: user.username, userId: user.id });
}
