import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/api-auth";
import { z } from "zod/v4";

const updateSchema = z.object({
  responseTimeMins: z.number().int().positive().optional(),
  resolveTimeMins: z.number().int().positive().optional(),
});

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

  const policy = await prisma.slaPolicy.update({
    where: { id },
    data: parsed.data,
  });

  return Response.json({ policy });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireRole(request, ["admin"]);
  if (auth instanceof Response) return auth;

  const { id } = await params;
  await prisma.slaPolicy.delete({ where: { id } });

  return Response.json({ success: true });
}
