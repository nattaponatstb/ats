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
  const eventId = searchParams.get("eventId");
  if (!eventId) return NextResponse.json([]);

  const files = await prisma.eventFile.findMany({
    where: { eventId },
    orderBy: { createdAt: "asc" },
  });

  // Deduplicate: keep only the first occurrence of each (section, fileName) pair
  const seen = new Set<string>();
  const unique = files.filter(f => {
    const key = `${f.section}|${f.fileName}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  return NextResponse.json(unique);
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const formData = await req.formData();
  const file = formData.get("file") as File;
  const eventId = formData.get("eventId") as string;
  const section = formData.get("section") as string;

  if (!file || !eventId) return NextResponse.json({ error: "Missing data" }, { status: 400 });

  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);
  const fileName = `${Date.now()}-${file.name.replace(/\s/g, "_")}`;
  const uploadDir = path.join(process.cwd(), "public", "uploads");
  await writeFile(path.join(uploadDir, fileName), buffer);

  const fileType = file.type.startsWith("image/") ? "image" : "pdf";
  const sectionKey = section || "general";

  // Prevent duplicate: if the same fileName already exists in this section for this event, return it
  const existing = await prisma.eventFile.findFirst({
    where: { eventId, section: sectionKey, fileName: file.name },
  });
  if (existing) return NextResponse.json(existing, { status: 200 });

  const record = await prisma.eventFile.create({
    data: {
      eventId,
      section: sectionKey,
      fileType,
      fileName: file.name,
      filePath: `/uploads/${fileName}`,
    },
  });

  return NextResponse.json(record, { status: 201 });
}
