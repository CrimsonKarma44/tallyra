import { json, options, readJson } from "@/lib/api-http";
import { signApiToken } from "@/lib/api-token";
import {
  createUser,
  normalizeUsername,
  validateEmail,
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
    email?: string;
  } | null;
  const username = normalizeUsername(String(body?.username ?? ""));
  const password = String(body?.password ?? "");
  const email = String(body?.email ?? "").trim();
  const usernameError = validateUsername(username);
  if (usernameError) {
    return json({ error: usernameError }, 400);
  }
  const passwordError = validatePassword(password);
  if (passwordError) {
    return json({ error: passwordError }, 400);
  }
  const emailError = validateEmail(email);
  if (emailError) {
    return json({ error: emailError }, 400);
  }
  const created = await createUser(username, password, email);
  if (!created.ok) {
    return json({ error: created.error }, 409);
  }
  const token = signApiToken(created.user);
  return json(
    { token, tokenType: "Bearer", username: created.user.username, userId: created.user.id },
    201,
  );
}
