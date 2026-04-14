import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/goals
// Query: status ('active' | 'completed' | 'all', default 'all')
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.user.id;

  try {
    const { searchParams } = req.nextUrl;
    const status = searchParams.get("status") ?? "all";

    let completedFilter: boolean | undefined;
    if (status === "active") completedFilter = false;
    else if (status === "completed") completedFilter = true;
    // 'all' → no filter

    const data = await prisma.goal.findMany({
      where: {
        userId,
        ...(completedFilter !== undefined ? { completed: completedFilter } : {}),
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ data });
  } catch (err) {
    console.error("[goals GET]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST /api/goals
// Body: GoalInput — required: title, type
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.user.id;

  try {
    const body = await req.json();
    const { title, type, description, targetValue, currentValue, unit, deadline } = body;

    if (!title) return NextResponse.json({ error: "title is required" }, { status: 400 });
    if (!type) return NextResponse.json({ error: "type is required" }, { status: 400 });

    const data = await prisma.goal.create({
      data: {
        userId,
        title,
        type,
        description: description ?? null,
        targetValue: targetValue ?? null,
        currentValue: currentValue ?? null,
        unit: unit ?? null,
        deadline: deadline ? new Date(deadline) : null,
        completed: false,
      },
    });

    return NextResponse.json({ data }, { status: 201 });
  } catch (err) {
    console.error("[goals POST]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
