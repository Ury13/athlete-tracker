import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/metrics
// Query: from, to (ISO dates), limit (default 90)
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
    const limit = parseInt(searchParams.get("limit") ?? "90", 10);

    const data = await prisma.bodyMetric.findMany({
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
      },
      orderBy: { date: "asc" },
      take: limit,
    });

    return NextResponse.json({ data });
  } catch (err) {
    console.error("[metrics GET]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST /api/metrics
// Body: { date, weight?, restingHR?, sleepHours?, sleepQuality?, hrv?, vo2max?, notes? }
// Upserts on unique (userId, date).
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.user.id;

  try {
    const body = await req.json();
    const { date, weight, restingHR, sleepHours, sleepQuality, hrv, vo2max, notes } = body;

    if (!date) return NextResponse.json({ error: "date is required" }, { status: 400 });

    const parsedDate = new Date(date);
    // Normalise to start-of-day to match the unique constraint semantics
    parsedDate.setHours(0, 0, 0, 0);

    const metricData = {
      weight: weight ?? null,
      restingHR: restingHR ?? null,
      sleepHours: sleepHours ?? null,
      sleepQuality: sleepQuality ?? null,
      hrv: hrv ?? null,
      vo2max: vo2max ?? null,
      notes: notes ?? null,
    };

    const data = await prisma.bodyMetric.upsert({
      where: { userId_date: { userId, date: parsedDate } },
      update: metricData,
      create: { userId, date: parsedDate, ...metricData },
    });

    return NextResponse.json({ data }, { status: 200 });
  } catch (err) {
    console.error("[metrics POST]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
