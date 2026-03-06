import { prisma } from "@/lib/prisma";

export async function GET() {
  const companies = await prisma.company.findMany({
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  return Response.json({ companies });
}
