import { prisma } from "./prisma";

type NotificationType = "issue_created" | "issue_assigned" | "status_changed" | "new_comment" | "sla_breach";

interface NotifyParams {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  issueId?: string;
}

export async function createNotification(params: NotifyParams) {
  return prisma.notification.create({
    data: {
      userId: params.userId,
      type: params.type as never,
      title: params.title,
      message: params.message,
      issueId: params.issueId,
    },
  });
}

export async function notifyTeamMembers(teamId: string, params: Omit<NotifyParams, "userId">) {
  const members = await prisma.teamMember.findMany({
    where: { teamId },
    select: { userId: true },
  });

  if (members.length === 0) return;

  await prisma.notification.createMany({
    data: members.map((m) => ({
      userId: m.userId,
      type: params.type as never,
      title: params.title,
      message: params.message,
      issueId: params.issueId,
    })),
  });
}

/** Notify when a new issue is created - notify assigned team */
export async function notifyNewIssue(issueId: string, teamId: string | null, title: string, companyName: string) {
  if (!teamId) return;
  await notifyTeamMembers(teamId, {
    type: "issue_created",
    title: "Issue ใหม่",
    message: `"${title}" จาก ${companyName}`,
    issueId,
  });
}

/** Notify when issue is assigned to a person */
export async function notifyAssignment(issueId: string, assigneeId: string, title: string) {
  await createNotification({
    userId: assigneeId,
    type: "issue_assigned",
    title: "คุณได้รับมอบหมาย Issue",
    message: `"${title}"`,
    issueId,
  });
}

/** Notify customer when status changes */
export async function notifyStatusChange(issueId: string, reporterId: string, title: string, newStatus: string) {
  const statusLabels: Record<string, string> = {
    open: "เปิด", in_progress: "กำลังดำเนินการ", waiting_customer: "รอลูกค้า",
    resolved: "แก้ไขแล้ว", closed: "ปิด",
  };
  await createNotification({
    userId: reporterId,
    type: "status_changed",
    title: "สถานะ Issue เปลี่ยน",
    message: `"${title}" → ${statusLabels[newStatus] ?? newStatus}`,
    issueId,
  });
}

/** Notify issue participants when a new comment is added */
export async function notifyNewComment(issueId: string, commenterId: string, issueTitle: string, commenterName: string) {
  // Get reporter and assignee
  const issue = await prisma.issue.findUnique({
    where: { id: issueId },
    select: { reporterId: true, assigneeId: true },
  });
  if (!issue) return;

  const notifyIds = new Set<string>();
  if (issue.reporterId !== commenterId) notifyIds.add(issue.reporterId);
  if (issue.assigneeId && issue.assigneeId !== commenterId) notifyIds.add(issue.assigneeId);

  if (notifyIds.size === 0) return;

  await prisma.notification.createMany({
    data: [...notifyIds].map((userId) => ({
      userId,
      type: "new_comment" as never,
      title: "ความคิดเห็นใหม่",
      message: `${commenterName} แสดงความคิดเห็นใน "${issueTitle}"`,
      issueId,
    })),
  });
}

/** Notify team leader about SLA breach */
export async function notifySlaBreached(issueId: string, teamId: string | null, title: string, breachType: string) {
  if (!teamId) return;
  // Find team leaders
  const leaders = await prisma.teamMember.findMany({
    where: { teamId, role: "leader" },
    select: { userId: true },
  });

  if (leaders.length === 0) return;

  await prisma.notification.createMany({
    data: leaders.map((l) => ({
      userId: l.userId,
      type: "sla_breach" as never,
      title: "SLA Breach Alert",
      message: `"${title}" - ${breachType} เกินกำหนด`,
      issueId,
    })),
  });
}
