import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, requireRole } from "@/lib/api-auth";
import { z } from "zod/v4";

const createSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().min(1),
  type: z.enum(["bug", "feature_request", "question", "complaint", "other"]),
  priority: z.enum(["low", "medium", "high", "critical"]),
  projectName: z.string().max(100).optional(),
});

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if (auth instanceof Response) return auth;

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
  const priority = searchParams.get("priority");
  const type = searchParams.get("type");
  const teamId = searchParams.get("teamId");
  const companyId = searchParams.get("companyId");
  const assigneeId = searchParams.get("assigneeId");
  const page = Math.max(1, Number(searchParams.get("page") || 1));
  const limit = Math.min(100, Math.max(1, Number(searchParams.get("limit") || 20)));

  // Build where clause based on role
  const where: Record<string, unknown> = {};

  // Customers can only see their own company's issues
  if (auth.role === "customer") {
    where.companyId = auth.companyId;
  } else if (auth.role === "support") {
    // Support sees issues assigned to their teams
    const memberTeams = await prisma.teamMember.findMany({
      where: { userId: auth.userId },
      select: { teamId: true },
    });
    where.teamId = { in: memberTeams.map((t) => t.teamId) };
  }
  // leader and admin see all

  if (status) where.status = status;
  if (priority) where.priority = priority;
  if (type) where.type = type;
  if (teamId) where.teamId = teamId;
  if (companyId && auth.role !== "customer") where.companyId = companyId;
  if (assigneeId) where.assigneeId = assigneeId;

  const [issues, total] = await Promise.all([
    prisma.issue.findMany({
      where,
      include: {
        company: { select: { id: true, name: true } },
        reporter: { select: { id: true, name: true, email: true } },
        assignee: { select: { id: true, name: true, email: true } },
        team: { select: { id: true, name: true } },
        _count: { select: { comments: true, attachments: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.issue.count({ where }),
  ]);

  return Response.json({ issues, total, page, limit });
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request);
  if (auth instanceof Response) return auth;

  const body = await request.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "Invalid input", details: parsed.error.issues }, { status: 400 });
  }

  const { title, description, type, priority, projectName } = parsed.data;

  // Auto-assign team based on issue type mapping
  const mapping = await prisma.teamIssueTypeMapping.findUnique({
    where: { issueType: type as never },
  });

  // Calculate SLA deadlines
  const slaPolicy = await prisma.slaPolicy.findUnique({
    where: { priority: priority as never },
  });

  const now = new Date();
  const slaResponseDeadline = slaPolicy
    ? new Date(now.getTime() + slaPolicy.responseTimeMins * 60 * 1000)
    : null;
  const slaResolveDeadline = slaPolicy
    ? new Date(now.getTime() + slaPolicy.resolveTimeMins * 60 * 1000)
    : null;

  const issue = await prisma.issue.create({
    data: {
      title,
      description,
      type: type as never,
      priority: priority as never,
      projectName,
      companyId: auth.companyId,
      reporterId: auth.userId,
      teamId: mapping?.teamId ?? null,
      slaResponseDeadline,
      slaResolveDeadline,
    },
    include: {
      company: { select: { id: true, name: true } },
      reporter: { select: { id: true, name: true } },
      team: { select: { id: true, name: true } },
    },
  });

  // Record initial status log
  await prisma.issueStatusLog.create({
    data: {
      issueId: issue.id,
      toStatus: "open",
      changedById: auth.userId,
    },
  });

  return Response.json({ issue }, { status: 201 });
}
