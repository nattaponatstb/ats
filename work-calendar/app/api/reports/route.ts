import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [totalTasks, totalEvents, totalDocuments, totalUsers, tasksByStatus, tasksByPriority, recentTasks] =
    await Promise.all([
      prisma.task.count(),
      prisma.event.count(),
      prisma.document.count(),
      prisma.user.count(),
      prisma.task.groupBy({ by: ["status"], _count: true }),
      prisma.task.groupBy({ by: ["priority"], _count: true }),
      prisma.task.findMany({
        take: 5,
        orderBy: { createdAt: "desc" },
        include: { assignee: { select: { name: true } } },
      }),
    ]);

  return NextResponse.json({
    totals: { tasks: totalTasks, events: totalEvents, documents: totalDocuments, users: totalUsers },
    tasksByStatus,
    tasksByPriority,
    recentTasks,
  });
}
