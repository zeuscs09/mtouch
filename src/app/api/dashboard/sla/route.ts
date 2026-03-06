import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/api-auth";
import { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const auth = await requireRole(request, ["admin", "leader", "support"]);
  if (auth instanceof Response) return auth;

  // Get all issues with SLA data
  const issues = await prisma.issue.findMany({
    select: {
      id: true,
      title: true,
      priority: true,
      status: true,
      slaResponseBreached: true,
      slaResolveBreached: true,
      slaResponseDeadline: true,
      slaResolveDeadline: true,
      firstRespondedAt: true,
      resolvedAt: true,
      createdAt: true,
      company: { select: { name: true } },
      team: { select: { name: true } },
    },
  });

  const totalWithSla = issues.filter((i) => i.slaResponseDeadline).length;
  const responseBreached = issues.filter((i) => i.slaResponseBreached).length;
  const resolveBreached = issues.filter((i) => i.slaResolveBreached).length;
  const responseCompliant = totalWithSla - responseBreached;
  const resolveCompliant = totalWithSla - resolveBreached;

  // Average response time (in minutes) for responded issues
  const respondedIssues = issues.filter((i) => i.firstRespondedAt);
  const avgResponseMins = respondedIssues.length > 0
    ? respondedIssues.reduce((sum, i) => {
        const diff = (i.firstRespondedAt!.getTime() - i.createdAt.getTime()) / 60000;
        return sum + diff;
      }, 0) / respondedIssues.length
    : 0;

  // Average resolve time (in minutes) for resolved issues
  const resolvedIssues = issues.filter((i) => i.resolvedAt);
  const avgResolveMins = resolvedIssues.length > 0
    ? resolvedIssues.reduce((sum, i) => {
        const diff = (i.resolvedAt!.getTime() - i.createdAt.getTime()) / 60000;
        return sum + diff;
      }, 0) / resolvedIssues.length
    : 0;

  // Breached issues list
  const breachedIssues = issues.filter((i) => i.slaResponseBreached || i.slaResolveBreached);

  // SLA by priority
  const priorities = ["critical", "high", "medium", "low"];
  const slaByPriority = priorities.map((p) => {
    const pIssues = issues.filter((i) => i.priority === p && i.slaResponseDeadline);
    const breached = pIssues.filter((i) => i.slaResponseBreached || i.slaResolveBreached).length;
    return {
      priority: p,
      total: pIssues.length,
      compliant: pIssues.length - breached,
      breached,
      complianceRate: pIssues.length > 0 ? ((pIssues.length - breached) / pIssues.length * 100).toFixed(1) : "0",
    };
  });

  return Response.json({
    totalWithSla,
    responseCompliance: totalWithSla > 0 ? ((responseCompliant / totalWithSla) * 100).toFixed(1) : "100",
    resolveCompliance: totalWithSla > 0 ? ((resolveCompliant / totalWithSla) * 100).toFixed(1) : "100",
    responseBreached,
    resolveBreached,
    avgResponseMins: Math.round(avgResponseMins),
    avgResolveMins: Math.round(avgResolveMins),
    breachedIssues,
    slaByPriority,
  });
}
