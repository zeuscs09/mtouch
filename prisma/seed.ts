import "dotenv/config";
import pg from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client.js";
import bcrypt from "bcryptjs";

const url = process.env.DATABASE_URL?.replace(/\?.*$/, ""); // strip query params
const pool = new pg.Pool({ connectionString: url });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("🌱 Seeding database...\n");

  // 1. SLA Policies
  const slaPolicies = [
    { priority: "critical" as const, responseTimeMins: 30, resolveTimeMins: 240 },
    { priority: "high" as const, responseTimeMins: 120, resolveTimeMins: 480 },
    { priority: "medium" as const, responseTimeMins: 240, resolveTimeMins: 1440 },
    { priority: "low" as const, responseTimeMins: 480, resolveTimeMins: 4320 },
  ];

  for (const policy of slaPolicies) {
    await prisma.slaPolicy.upsert({
      where: { priority: policy.priority },
      update: { responseTimeMins: policy.responseTimeMins, resolveTimeMins: policy.resolveTimeMins },
      create: policy,
    });
  }
  console.log("✅ SLA policies seeded");

  // 2. Companies
  const companies = [
    { name: "บริษัท เอบีซี จำกัด" },
    { name: "บริษัท ดีอีเอฟ จำกัด" },
    { name: "บริษัท เทค โซลูชั่น จำกัด" },
  ];

  const companyRecords = [];
  for (const c of companies) {
    const record = await prisma.company.upsert({
      where: { name: c.name },
      update: {},
      create: c,
    });
    companyRecords.push(record);
  }
  console.log(`✅ ${companyRecords.length} companies seeded`);

  // 3. Users
  const hash = await bcrypt.hash("Password123!", 10);
  const users = [
    { name: "สมชาย แอดมิน", email: "admin@demo.com", role: "admin" as const, companyIdx: 0 },
    { name: "สมหญิง หัวหน้า", email: "leader@demo.com", role: "leader" as const, companyIdx: 0 },
    { name: "สมศักดิ์ ซัพพอร์ต", email: "support1@demo.com", role: "support" as const, companyIdx: 0 },
    { name: "สมปอง ซัพพอร์ต", email: "support2@demo.com", role: "support" as const, companyIdx: 0 },
    { name: "วิชัย ลูกค้า", email: "customer1@demo.com", role: "customer" as const, companyIdx: 0 },
    { name: "อรุณ ลูกค้า", email: "customer2@demo.com", role: "customer" as const, companyIdx: 1 },
    { name: "ปรีชา ลูกค้า", email: "customer3@demo.com", role: "customer" as const, companyIdx: 2 },
  ];

  const userRecords = [];
  for (const u of users) {
    const record = await prisma.user.upsert({
      where: { email: u.email },
      update: {},
      create: {
        name: u.name,
        email: u.email,
        passwordHash: hash,
        role: u.role,
        companyId: companyRecords[u.companyIdx].id,
      },
    });
    userRecords.push(record);
  }
  console.log(`✅ ${userRecords.length} users seeded (password: Password123!)`);

  // 4. Teams
  const teams = [
    { name: "ทีม Backend", description: "ดูแลระบบ backend และ API" },
    { name: "ทีม Frontend", description: "ดูแล UI/UX และหน้าเว็บ" },
    { name: "ทีม Support", description: "ดูแลลูกค้าทั่วไป" },
  ];

  const teamRecords = [];
  for (const t of teams) {
    const record = await prisma.team.upsert({
      where: { name: t.name },
      update: {},
      create: t,
    });
    teamRecords.push(record);
  }

  // Add members to teams
  const teamMembers = [
    { teamIdx: 0, userIdx: 1, role: "leader" as const }, // สมหญิง -> Backend leader
    { teamIdx: 0, userIdx: 2, role: "member" as const }, // สมศักดิ์ -> Backend member
    { teamIdx: 1, userIdx: 1, role: "leader" as const }, // สมหญิง -> Frontend leader
    { teamIdx: 1, userIdx: 3, role: "member" as const }, // สมปอง -> Frontend member
    { teamIdx: 2, userIdx: 2, role: "member" as const }, // สมศักดิ์ -> Support member
    { teamIdx: 2, userIdx: 3, role: "member" as const }, // สมปอง -> Support member
  ];

  for (const tm of teamMembers) {
    await prisma.teamMember.upsert({
      where: {
        teamId_userId: { teamId: teamRecords[tm.teamIdx].id, userId: userRecords[tm.userIdx].id },
      },
      update: {},
      create: {
        teamId: teamRecords[tm.teamIdx].id,
        userId: userRecords[tm.userIdx].id,
        role: tm.role,
      },
    });
  }
  console.log(`✅ ${teamRecords.length} teams seeded with members`);

  // 5. Team-Issue Type Mappings
  const mappings = [
    { issueType: "bug" as const, teamIdx: 0 },
    { issueType: "feature_request" as const, teamIdx: 1 },
    { issueType: "question" as const, teamIdx: 2 },
    { issueType: "complaint" as const, teamIdx: 2 },
    { issueType: "other" as const, teamIdx: 2 },
  ];

  for (const m of mappings) {
    await prisma.teamIssueTypeMapping.upsert({
      where: { issueType: m.issueType },
      update: { teamId: teamRecords[m.teamIdx].id },
      create: { issueType: m.issueType, teamId: teamRecords[m.teamIdx].id },
    });
  }
  console.log("✅ Issue type → team mappings seeded");

  // 6. Demo Issues
  const issueData = [
    { title: "API ล็อกอินไม่ได้", desc: "เมื่อกดล็อกอินด้วยอีเมลที่ถูกต้อง ระบบแสดง error 500", type: "bug" as const, priority: "critical" as const, customerIdx: 4, companyIdx: 0, status: "in_progress" as const },
    { title: "ขอเพิ่มฟีเจอร์ export Excel", desc: "ต้องการ export รายงานเป็น Excel สำหรับผู้บริหาร", type: "feature_request" as const, priority: "medium" as const, customerIdx: 4, companyIdx: 0, status: "open" as const },
    { title: "วิธีรีเซ็ตรหัสผ่าน", desc: "ลืมรหัสผ่านครับ ต้องทำอย่างไร", type: "question" as const, priority: "low" as const, customerIdx: 5, companyIdx: 1, status: "resolved" as const },
    { title: "ระบบช้ามากตอนดึกๆ", desc: "หลังเที่ยงคืนระบบตอบสนองช้ามาก ใช้งานแทบไม่ได้", type: "complaint" as const, priority: "high" as const, customerIdx: 6, companyIdx: 2, status: "open" as const },
    { title: "หน้า Dashboard ไม่แสดงกราฟ", desc: "กราฟ SLA compliance ไม่โหลด แสดงหน้าว่าง", type: "bug" as const, priority: "high" as const, customerIdx: 4, companyIdx: 0, status: "open" as const },
    { title: "ต้องการเชื่อมต่อ LINE Notify", desc: "อยากให้ส่งแจ้งเตือนผ่าน LINE ได้ด้วยครับ", type: "feature_request" as const, priority: "low" as const, customerIdx: 5, companyIdx: 1, status: "open" as const },
  ];

  for (const issue of issueData) {
    const mapping = await prisma.teamIssueTypeMapping.findUnique({
      where: { issueType: issue.type },
    });

    const sla = await prisma.slaPolicy.findUnique({
      where: { priority: issue.priority },
    });

    const now = new Date();
    const created = new Date(now.getTime() - Math.random() * 3 * 24 * 60 * 60 * 1000); // random within 3 days

    const record = await prisma.issue.create({
      data: {
        title: issue.title,
        description: issue.desc,
        type: issue.type,
        priority: issue.priority,
        status: issue.status,
        companyId: companyRecords[issue.companyIdx].id,
        reporterId: userRecords[issue.customerIdx].id,
        teamId: mapping?.teamId ?? null,
        assigneeId: issue.status === "in_progress" ? userRecords[2].id : null,
        slaResponseDeadline: sla ? new Date(created.getTime() + sla.responseTimeMins * 60 * 1000) : null,
        slaResolveDeadline: sla ? new Date(created.getTime() + sla.resolveTimeMins * 60 * 1000) : null,
        slaResponseBreached: issue.status !== "open" && Math.random() > 0.7,
        slaResolveBreached: issue.status === "resolved" && Math.random() > 0.5,
        firstRespondedAt: issue.status !== "open" ? new Date(created.getTime() + 15 * 60 * 1000) : null,
        resolvedAt: issue.status === "resolved" ? new Date(created.getTime() + 2 * 60 * 60 * 1000) : null,
        createdAt: created,
      },
    });

    // Status log
    await prisma.issueStatusLog.create({
      data: { issueId: record.id, toStatus: "open", changedById: userRecords[issue.customerIdx].id, createdAt: created },
    });

    if (issue.status !== "open") {
      await prisma.issueStatusLog.create({
        data: {
          issueId: record.id,
          fromStatus: "open",
          toStatus: issue.status,
          changedById: userRecords[2].id,
          createdAt: new Date(created.getTime() + 10 * 60 * 1000),
        },
      });
    }

    // Add a comment to some issues
    if (Math.random() > 0.4) {
      await prisma.issueComment.create({
        data: {
          issueId: record.id,
          userId: userRecords[2].id,
          content: "รับทราบครับ กำลังตรวจสอบ",
          createdAt: new Date(created.getTime() + 15 * 60 * 1000),
        },
      });
    }
  }
  console.log(`✅ ${issueData.length} demo issues seeded with status logs and comments`);

  console.log("\n🎉 Seed complete!");
  console.log("\nDemo credentials (all use password: Password123!):");
  console.log("  Admin:    admin@demo.com");
  console.log("  Leader:   leader@demo.com");
  console.log("  Support:  support1@demo.com, support2@demo.com");
  console.log("  Customer: customer1@demo.com, customer2@demo.com, customer3@demo.com");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
