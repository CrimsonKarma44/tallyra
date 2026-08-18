import { json, options, requireApiUser } from "@/lib/api-http";

export function OPTIONS() {
  return options();
}

export async function GET(request: Request) {
  const auth = requireApiUser(request);
  if ("error" in auth) {
    return auth.error;
  }
  return json({ userId: auth.user.userId, username: auth.user.username });
}
