import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/dashboard/summary
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.user.id;

  try {
    const now = new Date();

    // ── Date boundaries ────────────────────────────────────────────────────────
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);

    const todayEnd = new Date(now);
    todayEnd.setHours(23, 59, 59, 999);

    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(now.getDate() - 7);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(now.getDate() - 30);
    thirtyDaysAgo.setHours(0, 0, 0, 0);

    // ── Fetch in parallel ──────────────────────────────────────────────────────
    const [
      trainingSessions7d,
      dietEntriesToday,
      dietEntriesWeek,
      bodyMetrics30d,
      activeGoalsCount,
      recentSessions,
    ] = await Promise.all([
      prisma.trainingSession.findMany({
        where: { userId, date: { gte: sevenDaysAgo } },
      }),
      prisma.dietEntry.findMany({
        where: { userId, date: { gte: todayStart, lte: todayEnd } },
      }),
      prisma.dietEntry.findMany({
        where: { userId, date: { gte: sevenDaysAgo } },
      }),
      prisma.bodyMetric.findMany({
        where: { userId, date: { gte: thirtyDaysAgo } },
      }),
      prisma.goal.count({ where: { userId, completed: false } }),
      prisma.trainingSession.findMany({
        where: { userId },
        orderBy: { date: "desc" },
        take: 5,
      }),
    ]);

    // ── Training stats ─────────────────────────────────────────────────────────
    const totalDistance = trainingSessions7d.reduce(
      (sum, s) => sum + (s.distance ?? 0),
      0
    );
    const totalSessions = trainingSessions7d.length;

    // ── Calories today ─────────────────────────────────────────────────────────
    const totalCaloriesIn = dietEntriesToday.reduce(
      (sum, e) => sum + (e.calories ?? 0),
      0
    );

    // ── Avg daily calories over last 7 days ────────────────────────────────────
    // Group by date string, sum per day, then average
    const calsByDay = new Map<string, number>();
    for (const entry of dietEntriesWeek) {
      const key = entry.date.toISOString().slice(0, 10);
      calsByDay.set(key, (calsByDay.get(key) ?? 0) + (entry.calories ?? 0));
    }
    const calDays = Array.from(calsByDay.values());
    const avgCaloriesThisWeek =
      calDays.length > 0
        ? calDays.reduce((a, b) => a + b, 0) / calDays.length
        : 0;

    // ── Body metrics averages ──────────────────────────────────────────────────
    const weightVals = bodyMetrics30d
      .map((m) => m.weight)
      .filter((v): v is number => v !== null);
    const sleepVals = bodyMetrics30d
      .map((m) => m.sleepHours)
      .filter((v): v is number => v !== null);

    const avgWeight =
      weightVals.length > 0
        ? weightVals.reduce((a, b) => a + b, 0) / weightVals.length
        : null;

    const avgSleepHours =
      sleepVals.length > 0
        ? sleepVals.reduce((a, b) => a + b, 0) / sleepVals.length
        : null;

    // ── Weekly calories array (last 7 days) ────────────────────────────────────
    const weeklyCalories: { date: string; calories: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      weeklyCalories.push({ date: key, calories: calsByDay.get(key) ?? 0 });
    }

    return NextResponse.json({
      data: {
        totalDistance,
        totalSessions,
        totalCaloriesIn,
        avgCaloriesThisWeek,
        avgWeight,
        avgSleepHours,
        activeGoals: activeGoalsCount,
        recentSessions,
        weeklyCalories,
      },
    });
  } catch (err) {
    console.error("[dashboard/summary GET]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
