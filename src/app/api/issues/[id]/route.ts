import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/api-auth";
import { z } from "zod/v4";
import { notifyAssignment } from "@/lib/notifications";

const updateSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().min(1).optional(),
  priority: z.enum(["low", "medium", "high", "critical"]).optional(),
  assigneeId: z.string().uuid().nullable().optional(),
  teamId: z.string().uuid().nullable().optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth(request);
  if (auth instanceof Response) return auth;

  const { id } = await params;

  const issue = await prisma.issue.findUnique({
    where: { id },
    include: {
      company: { select: { id: true, name: true } },
      reporter: { select: { id: true, name: true, email: true } },
      assignee: { select: { id: true, name: true, email: true } },
      team: { select: { id: true, name: true } },
      comments: {
        include: { user: { select: { id: true, name: true, role: true } } },
        orderBy: { createdAt: "asc" },
      },
      attachments: true,
      statusLogs: {
        include: { changedBy: { select: { id: true, name: true } } },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!issue) {
    return Response.json({ error: "Issue not found" }, { status: 404 });
  }

  // Customers can only see their own company's issues
  if (auth.role === "customer" && issue.companyId !== auth.companyId) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  return Response.json({ issue });
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth(request);
  if (auth instanceof Response) return auth;

  if (auth.role === "customer") {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "Invalid input", details: parsed.error.issues }, { status: 400 });
  }

  const existing = await prisma.issue.findUnique({ where: { id } });
  if (!existing) {
    return Response.json({ error: "Issue not found" }, { status: 404 });
  }

  const issue = await prisma.issue.update({
    where: { id },
    data: parsed.data as never,
    include: {
      company: { select: { id: true, name: true } },
      reporter: { select: { id: true, name: true } },
      assignee: { select: { id: true, name: true } },
      team: { select: { id: true, name: true } },
    },
  });

  // Notify assignee if changed
  if (parsed.data.assigneeId && parsed.data.assigneeId !== existing.assigneeId) {
    notifyAssignment(id, parsed.data.assigneeId, issue.title).catch(() => {});
  }

  return Response.json({ issue });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth(request);
  if (auth instanceof Response) return auth;

  if (!["admin", "leader"].includes(auth.role)) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  const existing = await prisma.issue.findUnique({ where: { id } });
  if (!existing) {
    return Response.json({ error: "Issue not found" }, { status: 404 });
  }

  await prisma.issue.delete({ where: { id } });

  return Response.json({ success: true });
}
