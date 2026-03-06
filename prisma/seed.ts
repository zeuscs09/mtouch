import "dotenv/config";
import pg from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client.js";

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const slaPolicies = [
    { priority: "critical" as const, responseTimeMins: 30, resolveTimeMins: 240 },
    { priority: "high" as const, responseTimeMins: 120, resolveTimeMins: 480 },
    { priority: "medium" as const, responseTimeMins: 240, resolveTimeMins: 1440 },
    { priority: "low" as const, responseTimeMins: 480, resolveTimeMins: 4320 },
  ];

  for (const policy of slaPolicies) {
    await prisma.slaPolicy.upsert({
      where: { priority: policy.priority },
      update: {
        responseTimeMins: policy.responseTimeMins,
        resolveTimeMins: policy.resolveTimeMins,
      },
      create: policy,
    });
  }

  console.log("Seeded default SLA policies");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
