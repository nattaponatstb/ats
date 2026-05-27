import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { writeFile } from "fs/promises";
import path from "path";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const taskId = searchParams.get("taskId");
  if (!taskId) return NextResponse.json([]);

  const files = await prisma.taskFile.findMany({
    where: { taskId },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json(files);
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const formData = await req.formData();
  const file = formData.get("file") as File;
  const taskId = formData.get("taskId") as string;

  if (!file || !taskId) return NextResponse.json({ error: "Missing data" }, { status: 400 });

  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);
  const fileName = `${Date.now()}-${file.name.replace(/\s/g, "_")}`;
  const uploadDir = path.join(process.cwd(), "public", "uploads");
  await writeFile(path.join(uploadDir, fileName), buffer);

  const fileType = file.type.startsWith("image/") ? "image" : "pdf";
  const record = await prisma.taskFile.create({
    data: { taskId, fileType, fileName: file.name, filePath: `/uploads/${fileName}` },
  });

  return NextResponse.json(record, { status: 201 });
}

export async function DELETE(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await req.json();
  await prisma.taskFile.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
