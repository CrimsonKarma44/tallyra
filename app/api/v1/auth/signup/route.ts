import { json, options, readJson } from "@/lib/api-http";
import { signApiToken } from "@/lib/api-token";
import {
  createUser,
  normalizeUsername,
  validatePassword,
  validateUsername,
} from "@/lib/auth";

export function OPTIONS() {
  return options();
}

export async function POST(request: Request) {
  const body = (await readJson(request)) as {
    username?: string;
    password?: string;
  } | null;
  const username = normalizeUsername(String(body?.username ?? ""));
  const password = String(body?.password ?? "");
  const usernameError = validateUsername(username);
  if (usernameError) {
    return json({ error: usernameError }, 400);
  }
  const passwordError = validatePassword(password);
  if (passwordError) {
    return json({ error: passwordError }, 400);
  }
  const created = await createUser(username, password);
  if (!created.ok) {
    return json({ error: created.error }, 409);
  }
  const token = signApiToken(created.user);
  return json(
    { token, tokenType: "Bearer", username: created.user.username, userId: created.user.id },
    201,
  );
}
