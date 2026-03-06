import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/api-auth";
import { z } from "zod/v4";

const createSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.email(),
  password: z.string().min(8).max(100),
  role: z.enum(["customer", "support", "leader", "admin"]),
  companyId: z.uuid(),
});

export async function GET(request: NextRequest) {
  const auth = await requireRole(request, ["admin"]);
  if (auth instanceof Response) return auth;

  const { searchParams } = new URL(request.url);
  const companyId = searchParams.get("companyId");
  const role = searchParams.get("role");

  const where: Record<string, unknown> = {};
  if (companyId) where.companyId = companyId;
  if (role) where.role = role;

  const users = await prisma.user.findMany({
    where,
    select: {
      id: true, name: true, email: true, role: true, companyId: true,
      company: { select: { name: true } },
      createdAt: true,
    },
    orderBy: { name: "asc" },
  });

  return Response.json({ users });
}

export async function POST(request: NextRequest) {
  const auth = await requireRole(request, ["admin"]);
  if (auth instanceof Response) return auth;

  const body = await request.json();
  const parsed = createSchema.safeParse(body);

  if (!parsed.success) {
    return Response.json({ error: "Invalid input", details: parsed.error.issues }, { status: 400 });
  }

  const { password, ...data } = parsed.data;
  const existing = await prisma.user.findUnique({ where: { email: data.email } });
  if (existing) {
    return Response.json({ error: "Email already registered" }, { status: 409 });
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const user = await prisma.user.create({
    data: { ...data, passwordHash },
    select: { id: true, name: true, email: true, role: true, companyId: true },
  });

  return Response.json({ user }, { status: 201 });
}
