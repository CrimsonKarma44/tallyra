import { json, options, requireApiUser } from "@/lib/api-http";
import { prisma } from "@/lib/prisma";

export function OPTIONS() {
  return options();
}

export async function GET(request: Request) {
  const auth = requireApiUser(request);
  if ("error" in auth) {
    return auth.error;
  }
  const record = await prisma.user.findUnique({
    where: { id: auth.user.userId },
    select: {
      organizationId: true,
      organization: { select: { name: true, adminId: true } },
    },
  });
  const isOrgAdmin = Boolean(
    record?.organizationId && record.organization?.adminId === auth.user.userId,
  );
  return json({
    userId: auth.user.userId,
    username: auth.user.username,
    organizationId: record?.organizationId ?? null,
    organizationName: record?.organization?.name ?? null,
    isOrgAdmin,
    hasPersonalLedger: !record?.organizationId || isOrgAdmin,
  });
}