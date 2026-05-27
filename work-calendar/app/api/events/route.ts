import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const events = await prisma.event.findMany({
    include: { user: { select: { id: true, name: true } } },
    orderBy: { startDate: "asc" },
  });

  return NextResponse.json(events);
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const event = await prisma.event.create({
    data: {
      title: body.title,
      description: body.description,
      startDate: new Date(body.startDate),
      endDate: new Date(body.endDate),
      allDay: body.allDay ?? false,
      color: body.color ?? "#3B82F6",
      location: body.location,
      metadata: body.metadata ?? null,
      userId: session.user.id,
    },
  });

  return NextResponse.json(event, { status: 201 });
}
