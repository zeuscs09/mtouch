import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/api-auth";
import { z } from "zod/v4";

const createSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
});

export async function GET(request: NextRequest) {
  const auth = await requireRole(request, ["admin", "leader"]);
  if (auth instanceof Response) return auth;

  const teams = await prisma.team.findMany({
    include: {
      members: {
        include: { user: { select: { id: true, name: true, email: true, role: true } } },
      },
      _count: { select: { issues: true } },
    },
    orderBy: { name: "asc" },
  });

  return Response.json({ teams });
}

export async function POST(request: NextRequest) {
  const auth = await requireRole(request, ["admin"]);
  if (auth instanceof Response) return auth;

  const body = await request.json();
  const parsed = createSchema.safeParse(body);

  if (!parsed.success) {
    return Response.json({ error: "Invalid input", details: parsed.error.issues }, { status: 400 });
  }

  const team = await prisma.team.create({ data: parsed.data });

  return Response.json({ team }, { status: 201 });
}
