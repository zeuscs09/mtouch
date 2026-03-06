import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/api-auth";
import { z } from "zod/v4";

const upsertSchema = z.object({
  issueType: z.enum(["bug", "feature_request", "question", "complaint", "other"]),
  teamId: z.uuid(),
});

export async function GET(request: NextRequest) {
  const auth = await requireRole(request, ["admin", "leader"]);
  if (auth instanceof Response) return auth;

  const mappings = await prisma.teamIssueTypeMapping.findMany({
    include: { team: { select: { id: true, name: true } } },
  });

  return Response.json({ mappings });
}

export async function POST(request: NextRequest) {
  const auth = await requireRole(request, ["admin"]);
  if (auth instanceof Response) return auth;

  const body = await request.json();
  const parsed = upsertSchema.safeParse(body);

  if (!parsed.success) {
    return Response.json({ error: "Invalid input", details: parsed.error.issues }, { status: 400 });
  }

  const mapping = await prisma.teamIssueTypeMapping.upsert({
    where: { issueType: parsed.data.issueType },
    update: { teamId: parsed.data.teamId },
    create: parsed.data,
    include: { team: { select: { id: true, name: true } } },
  });

  return Response.json({ mapping }, { status: 201 });
}

export async function DELETE(request: NextRequest) {
  const auth = await requireRole(request, ["admin"]);
  if (auth instanceof Response) return auth;

  const { searchParams } = new URL(request.url);
  const issueType = searchParams.get("issueType");

  if (!issueType) {
    return Response.json({ error: "issueType required" }, { status: 400 });
  }

  await prisma.teamIssueTypeMapping.deleteMany({
    where: { issueType: issueType as never },
  });

  return Response.json({ success: true });
}
