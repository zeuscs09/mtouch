import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/api-auth";
import { z } from "zod/v4";

const createSchema = z.object({
  priority: z.enum(["low", "medium", "high", "critical"]),
  responseTimeMins: z.number().int().positive(),
  resolveTimeMins: z.number().int().positive(),
});

export async function GET(request: NextRequest) {
  const auth = await requireRole(request, ["admin", "leader"]);
  if (auth instanceof Response) return auth;

  const policies = await prisma.slaPolicy.findMany({
    orderBy: { priority: "asc" },
  });

  return Response.json({ policies });
}

export async function POST(request: NextRequest) {
  const auth = await requireRole(request, ["admin"]);
  if (auth instanceof Response) return auth;

  const body = await request.json();
  const parsed = createSchema.safeParse(body);

  if (!parsed.success) {
    return Response.json({ error: "Invalid input", details: parsed.error.issues }, { status: 400 });
  }

  const policy = await prisma.slaPolicy.upsert({
    where: { priority: parsed.data.priority },
    update: {
      responseTimeMins: parsed.data.responseTimeMins,
      resolveTimeMins: parsed.data.resolveTimeMins,
    },
    create: parsed.data,
  });

  return Response.json({ policy }, { status: 201 });
}
