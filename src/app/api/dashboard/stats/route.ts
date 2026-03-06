import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/api-auth";
import { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const auth = await requireRole(request, ["admin", "leader", "support"]);
  if (auth instanceof Response) return auth;

  const [
    totalIssues,
    openIssues,
    inProgressIssues,
    resolvedIssues,
    slaResponseBreached,
    slaResolveBreached,
    recentIssues,
    issuesByStatus,
    issuesByPriority,
    issuesByType,
  ] = await Promise.all([
    prisma.issue.count(),
    prisma.issue.count({ where: { status: "open" } }),
    prisma.issue.count({ where: { status: "in_progress" } }),
    prisma.issue.count({ where: { status: { in: ["resolved", "closed"] } } }),
    prisma.issue.count({ where: { slaResponseBreached: true } }),
    prisma.issue.count({ where: { slaResolveBreached: true } }),
    prisma.issue.findMany({
      take: 5,
      orderBy: { createdAt: "desc" },
      include: {
        company: { select: { name: true } },
        reporter: { select: { name: true } },
        team: { select: { name: true } },
      },
    }),
    prisma.issue.groupBy({ by: ["status"], _count: true }),
    prisma.issue.groupBy({ by: ["priority"], _count: true }),
    prisma.issue.groupBy({ by: ["type"], _count: true }),
  ]);

  return Response.json({
    totalIssues,
    openIssues,
    inProgressIssues,
    resolvedIssues,
    slaResponseBreached,
    slaResolveBreached,
    recentIssues,
    issuesByStatus: issuesByStatus.map((s) => ({ status: s.status, count: s._count })),
    issuesByPriority: issuesByPriority.map((p) => ({ priority: p.priority, count: p._count })),
    issuesByType: issuesByType.map((t) => ({ type: t.type, count: t._count })),
  });
}
