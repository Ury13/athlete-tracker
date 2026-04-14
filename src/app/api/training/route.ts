import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/training
// Query: from, to (ISO dates), limit (default 50), type
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.user.id;

  try {
    const { searchParams } = req.nextUrl;
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    const limit = parseInt(searchParams.get("limit") ?? "50", 10);
    const type = searchParams.get("type");

    const data = await prisma.trainingSession.findMany({
      where: {
        userId,
        ...(from || to
          ? {
              date: {
                ...(from ? { gte: new Date(from) } : {}),
                ...(to ? { lte: new Date(to) } : {}),
              },
            }
          : {}),
        ...(type ? { type } : {}),
      },
      orderBy: { date: "desc" },
      take: limit,
    });

    return NextResponse.json({ data });
  } catch (err) {
    console.error("[training GET]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST /api/training
// Body: TrainingSessionInput
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.user.id;

  try {
    const body = await req.json();
    const { date, type, duration, distance, pace, heartRateAvg, heartRateMax,
            elevationGain, calories, perceivedEffort, notes } = body;

    if (!date) return NextResponse.json({ error: "date is required" }, { status: 400 });
    if (!type) return NextResponse.json({ error: "type is required" }, { status: 400 });
    if (typeof duration !== "number") {
      return NextResponse.json({ error: "duration must be a number" }, { status: 400 });
    }

    const data = await prisma.trainingSession.create({
      data: {
        userId,
        date: new Date(date),
        type,
        duration,
        distance: distance ?? null,
        pace: pace ?? null,
        heartRateAvg: heartRateAvg ?? null,
        heartRateMax: heartRateMax ?? null,
        elevationGain: elevationGain ?? null,
        calories: calories ?? null,
        perceivedEffort: perceivedEffort ?? 5,
        notes: notes ?? null,
      },
    });

    return NextResponse.json({ data }, { status: 201 });
  } catch (err) {
    console.error("[training POST]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
