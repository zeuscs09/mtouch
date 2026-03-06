import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/api-auth";
import { z } from "zod/v4";

const updateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireRole(request, ["admin", "leader"]);
  if (auth instanceof Response) return auth;

  const { id } = await params;
  const team = await prisma.team.findUnique({
    where: { id },
    include: {
      members: {
        include: { user: { select: { id: true, name: true, email: true, role: true } } },
      },
      issueTypeMappings: true,
      _count: { select: { issues: true } },
    },
  });

  if (!team) {
    return Response.json({ error: "Team not found" }, { status: 404 });
  }

  return Response.json({ team });
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireRole(request, ["admin"]);
  if (auth instanceof Response) return auth;

  const { id } = await params;
  const body = await request.json();
  const parsed = updateSchema.safeParse(body);

  if (!parsed.success) {
    return Response.json({ error: "Invalid input", details: parsed.error.issues }, { status: 400 });
  }

  const team = await prisma.team.update({ where: { id }, data: parsed.data });

  return Response.json({ team });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireRole(request, ["admin"]);
  if (auth instanceof Response) return auth;

  const { id } = await params;
  await prisma.team.delete({ where: { id } });

  return Response.json({ success: true });
}
