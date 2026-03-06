import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/api-auth";

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if (auth instanceof Response) return auth;

  const { searchParams } = new URL(request.url);
  const unreadOnly = searchParams.get("unread") === "true";
  const limit = Math.min(50, Number(searchParams.get("limit") || 20));

  const where: Record<string, unknown> = { userId: auth.userId };
  if (unreadOnly) where.isRead = false;

  const [notifications, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
      include: {
        issue: { select: { id: true, title: true, status: true } },
      },
    }),
    prisma.notification.count({ where: { userId: auth.userId, isRead: false } }),
  ]);

  return Response.json({ notifications, unreadCount });
}

export async function PUT(request: NextRequest) {
  const auth = await requireAuth(request);
  if (auth instanceof Response) return auth;

  const body = await request.json();

  if (body.markAllRead) {
    await prisma.notification.updateMany({
      where: { userId: auth.userId, isRead: false },
      data: { isRead: true },
    });
    return Response.json({ success: true });
  }

  if (body.id) {
    await prisma.notification.updateMany({
      where: { id: body.id, userId: auth.userId },
      data: { isRead: true },
    });
    return Response.json({ success: true });
  }

  return Response.json({ error: "Invalid request" }, { status: 400 });
}
