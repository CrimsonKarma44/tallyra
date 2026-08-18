import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

export async function GET() {
  const session = await getSession();
  if (!session.userId) {
    return new NextResponse(null, { status: 401 });
  }
  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { avatar: true, avatarMime: true },
  });
  if (!user?.avatar || !user.avatarMime) {
    return new NextResponse(null, { status: 404 });
  }
  return new Response(user.avatar, {
    headers: {
      "Content-Type": user.avatarMime,
      "Cache-Control": "private, max-age=3600",
    },
  });
}