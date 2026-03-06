import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/api-auth";
import { z } from "zod/v4";

const addMemberSchema = z.object({
  userId: z.uuid(),
  role: z.enum(["leader", "member"]).default("member"),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireRole(request, ["admin"]);
  if (auth instanceof Response) return auth;

  const { id: teamId } = await params;
  const body = await request.json();
  const parsed = addMemberSchema.safeParse(body);

  if (!parsed.success) {
    return Response.json({ error: "Invalid input", details: parsed.error.issues }, { status: 400 });
  }

  const member = await prisma.teamMember.create({
    data: { teamId, ...parsed.data },
    include: { user: { select: { id: true, name: true, email: true } } },
  });

  return Response.json({ member }, { status: 201 });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireRole(request, ["admin"]);
  if (auth instanceof Response) return auth;

  const { id: teamId } = await params;
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId");

  if (!userId) {
    return Response.json({ error: "userId required" }, { status: 400 });
  }

  await prisma.teamMember.deleteMany({ where: { teamId, userId } });

  return Response.json({ success: true });
}
