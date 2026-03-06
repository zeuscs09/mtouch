import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/api-auth";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { randomUUID } from "crypto";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_FILES_PER_ISSUE = 5;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth(request);
  if (auth instanceof Response) return auth;

  const { id } = await params;

  const issue = await prisma.issue.findUnique({ where: { id }, select: { companyId: true } });
  if (!issue) {
    return Response.json({ error: "Issue not found" }, { status: 404 });
  }

  if (auth.role === "customer" && issue.companyId !== auth.companyId) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const attachments = await prisma.issueAttachment.findMany({
    where: { issueId: id },
    orderBy: { createdAt: "asc" },
  });

  return Response.json({ attachments });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth(request);
  if (auth instanceof Response) return auth;

  const { id } = await params;

  const issue = await prisma.issue.findUnique({
    where: { id },
    select: { companyId: true, _count: { select: { attachments: true } } },
  });
  if (!issue) {
    return Response.json({ error: "Issue not found" }, { status: 404 });
  }

  if (auth.role === "customer" && issue.companyId !== auth.companyId) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  if (issue._count.attachments >= MAX_FILES_PER_ISSUE) {
    return Response.json({ error: `Maximum ${MAX_FILES_PER_ISSUE} files per issue` }, { status: 400 });
  }

  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  if (!file) {
    return Response.json({ error: "No file provided" }, { status: 400 });
  }

  if (file.size > MAX_FILE_SIZE) {
    return Response.json({ error: "File too large (max 10MB)" }, { status: 400 });
  }

  // Save file to uploads directory
  const uploadDir = join(process.cwd(), "public", "uploads", id);
  await mkdir(uploadDir, { recursive: true });

  const ext = file.name.split(".").pop() || "bin";
  const savedName = `${randomUUID()}.${ext}`;
  const filePath = join(uploadDir, savedName);
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(filePath, buffer);

  const fileUrl = `/uploads/${id}/${savedName}`;

  const attachment = await prisma.issueAttachment.create({
    data: {
      issueId: id,
      fileUrl,
      fileName: file.name,
      fileType: file.type || "application/octet-stream",
      fileSize: file.size,
    },
  });

  return Response.json({ attachment }, { status: 201 });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth(request);
  if (auth instanceof Response) return auth;

  if (auth.role === "customer") {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const attachmentId = searchParams.get("attachmentId");

  if (!attachmentId) {
    return Response.json({ error: "attachmentId required" }, { status: 400 });
  }

  const attachment = await prisma.issueAttachment.findFirst({
    where: { id: attachmentId, issueId: id },
  });

  if (!attachment) {
    return Response.json({ error: "Attachment not found" }, { status: 404 });
  }

  await prisma.issueAttachment.delete({ where: { id: attachmentId } });

  return Response.json({ success: true });
}
