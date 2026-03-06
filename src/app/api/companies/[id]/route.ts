import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/api-auth";
import { z } from "zod/v4";

const updateSchema = z.object({
  name: z.string().min(1).max(100),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireRole(request, ["admin"]);
  if (auth instanceof Response) return auth;

  const { id } = await params;
  const company = await prisma.company.findUnique({
    where: { id },
    include: { _count: { select: { users: true, issues: true } } },
  });

  if (!company) {
    return Response.json({ error: "Company not found" }, { status: 404 });
  }

  return Response.json({ company });
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

  const company = await prisma.company.update({
    where: { id },
    data: parsed.data,
  });

  return Response.json({ company });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireRole(request, ["admin"]);
  if (auth instanceof Response) return auth;

  const { id } = await params;
  await prisma.company.delete({ where: { id } });

  return Response.json({ success: true });
}
