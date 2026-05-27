import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const groupKey = searchParams.get("group");
  if (!groupKey) return NextResponse.json([]);

  const options = await prisma.dropdownOption.findMany({
    where: { groupKey },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json(options);
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { groupKey, label } = await req.json();
  if (!groupKey || !label) return NextResponse.json({ error: "Invalid" }, { status: 400 });

  const option = await prisma.dropdownOption.upsert({
    where: { groupKey_label: { groupKey, label } },
    update: {},
    create: { groupKey, label },
  });

  return NextResponse.json(option, { status: 201 });
}

export async function PUT(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, label, cascadePrefixes } = await req.json();
  if (!id || !label) return NextResponse.json({ error: "Invalid" }, { status: 400 });

  const option = await prisma.dropdownOption.update({
    where: { id },
    data: { label },
  });

  // Cascade-rename all sub-item groupKeys that used the old name as a path segment
  if (Array.isArray(cascadePrefixes) && cascadePrefixes.length > 0) {
    for (const { old: oldPfx, new: newPfx } of cascadePrefixes as { old: string; new: string }[]) {
      if (!oldPfx || !newPfx || oldPfx === newPfx) continue;

      // Match groupKey === oldPfx  OR  groupKey starts with oldPfx + "__"
      const affected = await prisma.dropdownOption.findMany({
        where: {
          OR: [
            { groupKey: oldPfx },
            { groupKey: { startsWith: `${oldPfx}__` } },
          ],
        },
      });

      for (const opt of affected) {
        const newGroupKey = newPfx + opt.groupKey.slice(oldPfx.length);
        if (newGroupKey === opt.groupKey) continue;

        // If the new (groupKey, label) already exists, remove the stale duplicate
        const duplicate = await prisma.dropdownOption.findUnique({
          where: { groupKey_label: { groupKey: newGroupKey, label: opt.label } },
        });
        if (duplicate) {
          await prisma.dropdownOption.delete({ where: { id: opt.id } });
        } else {
          await prisma.dropdownOption.update({
            where: { id: opt.id },
            data: { groupKey: newGroupKey },
          });
        }
      }
    }
  }

  return NextResponse.json(option);
}

export async function DELETE(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();

  if (body.id) {
    // Single delete by ID
    await prisma.dropdownOption.delete({ where: { id: body.id } });
  } else if (Array.isArray(body.prefixes)) {
    // Bulk delete: each prefix matches groupKey === pfx OR groupKey starts with pfx + "__"
    for (const pfx of body.prefixes as string[]) {
      await prisma.dropdownOption.deleteMany({
        where: {
          OR: [
            { groupKey: pfx },
            { groupKey: { startsWith: `${pfx}__` } },
          ],
        },
      });
    }
  }

  return NextResponse.json({ success: true });
}
