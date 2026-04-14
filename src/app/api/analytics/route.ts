import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { calcEMA, getWeekStart } from "@/lib/utils";

// GET /api/analytics
// Query: from, to (ISO), defaults to last 30 days
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.user.id;

  try {
    const { searchParams } = req.nextUrl;
    const now = new Date();

    const defaultFrom = new Date(now);
    defaultFrom.setDate(now.getDate() - 30);
    defaultFrom.setHours(0, 0, 0, 0);

    const from = searchParams.get("from") ? new Date(searchParams.get("from")!) : defaultFrom;
    const to = searchParams.get("to") ? new Date(searchParams.get("to")!) : now;

    // ── Fetch in parallel ──────────────────────────────────────────────────────
    const [trainingSessions, dietEntries, bodyMetrics] = await Promise.all([
      prisma.trainingSession.findMany({
        where: { userId, date: { gte: from, lte: to } },
        orderBy: { date: "asc" },
      }),
      prisma.dietEntry.findMany({
        where: { userId, date: { gte: from, lte: to } },
        orderBy: { date: "asc" },
      }),
      prisma.bodyMetric.findMany({
        where: { userId, date: { gte: from, lte: to } },
        orderBy: { date: "asc" },
      }),
    ]);

    // ── Training analytics ─────────────────────────────────────────────────────

    // Weekly mileage
    const weeklyMap = new Map<string, number>();
    for (const s of trainingSessions) {
      const weekStart = getWeekStart(new Date(s.date)).toISOString().slice(0, 10);
      weeklyMap.set(weekStart, (weeklyMap.get(weekStart) ?? 0) + (s.distance ?? 0));
    }
    const weeklyMileage = Array.from(weeklyMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([week, km]) => ({ week, km }));

    // Type distribution
    const typeMap = new Map<string, { count: number; totalKm: number }>();
    for (const s of trainingSessions) {
      const entry = typeMap.get(s.type) ?? { count: 0, totalKm: 0 };
      entry.count += 1;
      entry.totalKm += s.distance ?? 0;
      typeMap.set(s.type, entry);
    }
    const typeDistribution = Array.from(typeMap.entries()).map(([type, stats]) => ({
      type,
      count: stats.count,
      totalKm: stats.totalKm,
    }));

    // PMC — Performance Management Chart
    // Build a day-indexed TSS map, fill all dates in range, compute rolling EMAs
    const tssMap = new Map<string, number>();
    for (const s of trainingSessions) {
      const key = new Date(s.date).toISOString().slice(0, 10);
      const tss = (s.duration * s.perceivedEffort) / 10;
      tssMap.set(key, (tssMap.get(key) ?? 0) + tss);
    }

    // Build a complete daily series from `from` to `to`
    const allDates: string[] = [];
    const cursor = new Date(from);
    cursor.setHours(0, 0, 0, 0);
    const toDay = new Date(to);
    toDay.setHours(23, 59, 59, 999);
    while (cursor <= toDay) {
      allDates.push(cursor.toISOString().slice(0, 10));
      cursor.setDate(cursor.getDate() + 1);
    }

    const tssValues = allDates.map((d) => tssMap.get(d) ?? 0);
    const ctlValues = calcEMA(tssValues, 42);
    const atlValues = calcEMA(tssValues, 7);

    const pmc = allDates.map((date, i) => ({
      date,
      ctl: parseFloat(ctlValues[i].toFixed(2)),
      atl: parseFloat(atlValues[i].toFixed(2)),
      tsb: parseFloat((ctlValues[i] - atlValues[i]).toFixed(2)),
    }));

    // ── Nutrition analytics ────────────────────────────────────────────────────
    const dailyNutritionMap = new Map<
      string,
      { calories: number; protein: number; carbs: number; fat: number }
    >();
    for (const e of dietEntries) {
      const key = new Date(e.date).toISOString().slice(0, 10);
      const entry = dailyNutritionMap.get(key) ?? {
        calories: 0,
        protein: 0,
        carbs: 0,
        fat: 0,
      };
      entry.calories += e.calories ?? 0;
      entry.protein += e.protein ?? 0;
      entry.carbs += e.carbs ?? 0;
      entry.fat += e.fat ?? 0;
      dailyNutritionMap.set(key, entry);
    }

    const dailyCalories = Array.from(dailyNutritionMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, vals]) => ({ date, ...vals }));

    const nutritionDays = dailyCalories.length;
    const nutritionAverages =
      nutritionDays > 0
        ? {
            calories: dailyCalories.reduce((s, d) => s + d.calories, 0) / nutritionDays,
            protein: dailyCalories.reduce((s, d) => s + d.protein, 0) / nutritionDays,
            carbs: dailyCalories.reduce((s, d) => s + d.carbs, 0) / nutritionDays,
            fat: dailyCalories.reduce((s, d) => s + d.fat, 0) / nutritionDays,
          }
        : { calories: 0, protein: 0, carbs: 0, fat: 0 };

    // ── Body metrics analytics ─────────────────────────────────────────────────
    const nonNull = <T>(arr: (T | null)[]): T[] =>
      arr.filter((v): v is T => v !== null);

    const weightVals = nonNull(bodyMetrics.map((m) => m.weight));
    const hrVals = nonNull(bodyMetrics.map((m) => m.restingHR));
    const sleepVals = nonNull(bodyMetrics.map((m) => m.sleepHours));
    const hrvVals = nonNull(bodyMetrics.map((m) => m.hrv));

    const avg = (arr: number[]) =>
      arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : null;

    const metricsAverages = {
      weight: avg(weightVals),
      restingHR: avg(hrVals),
      sleepHours: avg(sleepVals),
      hrv: avg(hrvVals),
    };

    return NextResponse.json({
      data: {
        training: {
          sessions: trainingSessions,
          weeklyMileage,
          typeDistribution,
          pmc,
        },
        nutrition: {
          dailyCalories,
          averages: nutritionAverages,
        },
        bodyMetrics: {
          metrics: bodyMetrics,
          averages: metricsAverages,
        },
      },
    });
  } catch (err) {
    console.error("[analytics GET]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
