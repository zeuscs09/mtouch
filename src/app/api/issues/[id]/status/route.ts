import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/api-auth";
import { z } from "zod/v4";
import { notifyStatusChange, notifySlaBreached } from "@/lib/notifications";

const statusSchema = z.object({
  status: z.enum(["open", "in_progress", "waiting_customer", "resolved", "closed"]),
});

// Valid status transitions
const validTransitions: Record<string, string[]> = {
  open: ["in_progress"],
  in_progress: ["waiting_customer", "resolved"],
  waiting_customer: ["in_progress", "resolved"],
  resolved: ["closed", "in_progress"],
  closed: ["open"],
};

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth(request);
  if (auth instanceof Response) return auth;

  // Only support staff can change status
  if (auth.role === "customer") {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json();
  const parsed = statusSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "Invalid status", details: parsed.error.issues }, { status: 400 });
  }

  const issue = await prisma.issue.findUnique({ where: { id } });
  if (!issue) {
    return Response.json({ error: "Issue not found" }, { status: 404 });
  }

  const newStatus = parsed.data.status;
  const allowed = validTransitions[issue.status] ?? [];
  if (!allowed.includes(newStatus)) {
    return Response.json(
      { error: `Cannot transition from '${issue.status}' to '${newStatus}'` },
      { status: 400 }
    );
  }

  // Prepare update data
  const updateData: Record<string, unknown> = { status: newStatus as never };
  const now = new Date();

  // Track first response time (when moving from open to in_progress)
  if (issue.status === "open" && newStatus === "in_progress" && !issue.firstRespondedAt) {
    updateData.firstRespondedAt = now;
    // Check SLA response breach
    if (issue.slaResponseDeadline && now > issue.slaResponseDeadline) {
      updateData.slaResponseBreached = true;
    }
  }

  // Track resolution time
  if (newStatus === "resolved" && !issue.resolvedAt) {
    updateData.resolvedAt = now;
    // Check SLA resolve breach
    if (issue.slaResolveDeadline && now > issue.slaResolveDeadline) {
      updateData.slaResolveBreached = true;
    }
  }

  // If reopened from resolved, clear resolved timestamp
  if (issue.status === "resolved" && newStatus === "in_progress") {
    updateData.resolvedAt = null;
  }

  const [updatedIssue] = await Promise.all([
    prisma.issue.update({
      where: { id },
      data: updateData as never,
      include: {
        company: { select: { id: true, name: true } },
        reporter: { select: { id: true, name: true } },
        assignee: { select: { id: true, name: true } },
        team: { select: { id: true, name: true } },
      },
    }),
    // Record status change in audit log
    prisma.issueStatusLog.create({
      data: {
        issueId: id,
        fromStatus: issue.status as never,
        toStatus: newStatus as never,
        changedById: auth.userId,
      },
    }),
  ]);

  // Notify customer about status change
  notifyStatusChange(id, issue.reporterId, issue.title, newStatus).catch(() => {});

  // Notify about SLA breach if applicable
  if (updateData.slaResponseBreached) {
    notifySlaBreached(id, issue.teamId, issue.title, "Response Time").catch(() => {});
  }
  if (updateData.slaResolveBreached) {
    notifySlaBreached(id, issue.teamId, issue.title, "Resolve Time").catch(() => {});
  }

  return Response.json({ issue: updatedIssue });
}
