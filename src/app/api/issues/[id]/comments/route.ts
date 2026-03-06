import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/api-auth";
import { z } from "zod/v4";
import { notifyNewComment } from "@/lib/notifications";

const commentSchema = z.object({
  content: z.string().min(1).max(5000),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth(request);
  if (auth instanceof Response) return auth;

  const { id } = await params;

  const issue = await prisma.issue.findUnique({ where: { id }, select: { companyId: true } });
  if (!issue) {
    return Response.json({ error: "Issue not found" }, { status: 404 });
  }

  if (auth.role === "customer" && issue.companyId !== auth.companyId) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const comments = await prisma.issueComment.findMany({
    where: { issueId: id },
    include: { user: { select: { id: true, name: true, role: true } } },
    orderBy: { createdAt: "asc" },
  });

  return Response.json({ comments });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth(request);
  if (auth instanceof Response) return auth;

  const { id } = await params;
  const body = await request.json();
  const parsed = commentSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "Invalid input", details: parsed.error.issues }, { status: 400 });
  }

  const issue = await prisma.issue.findUnique({ where: { id }, select: { id: true, companyId: true, status: true, firstRespondedAt: true, slaResponseDeadline: true, slaResponseBreached: true } });
  if (!issue) {
    return Response.json({ error: "Issue not found" }, { status: 404 });
  }

  if (auth.role === "customer" && issue.companyId !== auth.companyId) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const comment = await prisma.issueComment.create({
    data: {
      issueId: id,
      userId: auth.userId,
      content: parsed.data.content,
    },
    include: { user: { select: { id: true, name: true, role: true } } },
  });

  // If this is the first support response, track first response time
  if (
    auth.role !== "customer" &&
    !issue.firstRespondedAt
  ) {
    const now = new Date();
    await prisma.issue.update({
      where: { id },
      data: {
        firstRespondedAt: now,
        slaResponseBreached: issue.slaResponseDeadline ? now > issue.slaResponseDeadline : false,
      },
    });
  }

  // Notify issue participants
  notifyNewComment(id, auth.userId, issue.id, comment.user.name).catch(() => {});

  return Response.json({ comment }, { status: 201 });
}
