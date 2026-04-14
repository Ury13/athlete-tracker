import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// ── Helpers ───────────────────────────────────────────────────────────────────

function avg(arr: number[]): number {
  if (arr.length === 0) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function stddev(arr: number[]): number {
  if (arr.length < 2) return 0;
  const mean = avg(arr);
  return Math.sqrt(arr.reduce((s, v) => s + (v - mean) ** 2, 0) / arr.length);
}

function dayKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

// ── Training insight engine ───────────────────────────────────────────────────

function analyzeTraining(sessions: {
  date: Date;
  type: string;
  duration: number;
  distance: number | null;
  perceivedEffort: number;
  heartRateAvg: number | null;
}[]): string {
  const lines: string[] = [];

  if (sessions.length === 0) {
    return "No training sessions logged in the past 14 days. Start logging your workouts to get personalized insights!";
  }

  // Frequency
  const daysWithSession = new Set(sessions.map((s) => dayKey(s.date))).size;
  const weeksSpanned = 2;
  const sessionsPerWeek = sessions.length / weeksSpanned;

  if (sessionsPerWeek >= 5) {
    lines.push(`High training frequency: ${sessions.length} sessions over 14 days (${sessionsPerWeek.toFixed(1)}/week). Make sure you're including enough easy days.`);
  } else if (sessionsPerWeek >= 3) {
    lines.push(`Good consistency: ${sessions.length} sessions in 14 days (${sessionsPerWeek.toFixed(1)}/week) across ${daysWithSession} different days.`);
  } else {
    lines.push(`Low training frequency: only ${sessions.length} sessions in 14 days. Aim for at least 3 sessions/week for meaningful adaptation.`);
  }

  // Load progression (week 1 vs week 2)
  const now = new Date();
  const week1Start = new Date(now); week1Start.setDate(now.getDate() - 14);
  const week2Start = new Date(now); week2Start.setDate(now.getDate() - 7);
  const week1 = sessions.filter((s) => s.date >= week1Start && s.date < week2Start);
  const week2 = sessions.filter((s) => s.date >= week2Start);
  const load1 = week1.reduce((s, x) => s + x.duration * x.perceivedEffort, 0);
  const load2 = week2.reduce((s, x) => s + x.duration * x.perceivedEffort, 0);

  if (load1 > 0 && load2 > 0) {
    const loadChange = ((load2 - load1) / load1) * 100;
    if (loadChange > 20) {
      lines.push(`Training load jumped ${loadChange.toFixed(0)}% this week vs last. The 10% rule suggests keeping weekly load increases under 10% to avoid injury risk.`);
    } else if (loadChange > 5) {
      lines.push(`Solid progressive overload: training load increased ${loadChange.toFixed(0)}% this week — well within the safe 10% ceiling.`);
    } else if (loadChange < -15) {
      lines.push(`Training load dropped ${Math.abs(loadChange).toFixed(0)}% this week. If intentional (recovery week), great. Otherwise try to maintain consistency.`);
    } else {
      lines.push(`Training load is stable week-over-week (${loadChange > 0 ? "+" : ""}${loadChange.toFixed(0)}%). Consistent base building.`);
    }
  }

  // Consecutive training days without rest
  const sortedDays = Array.from(new Set(sessions.map((s) => dayKey(s.date)))).sort();
  let maxStreak = 1, currentStreak = 1;
  for (let i = 1; i < sortedDays.length; i++) {
    const prev = new Date(sortedDays[i - 1]);
    const curr = new Date(sortedDays[i]);
    const diff = (curr.getTime() - prev.getTime()) / 86400000;
    if (diff === 1) {
      currentStreak++;
      maxStreak = Math.max(maxStreak, currentStreak);
    } else {
      currentStreak = 1;
    }
  }
  if (maxStreak >= 5) {
    lines.push(`Longest training streak: ${maxStreak} consecutive days — consider building in more rest days for muscle repair and adaptation.`);
  } else if (maxStreak >= 3) {
    lines.push(`You had a ${maxStreak}-day training streak, which is solid. Keep alternating hard and easy days.`);
  }

  // RPE trend
  const efforts = sessions.map((s) => s.perceivedEffort).filter(Boolean);
  if (efforts.length >= 3) {
    const avgEffort = avg(efforts);
    const effortSD = stddev(efforts);
    if (avgEffort > 7.5) {
      lines.push(`Average perceived effort is high (${avgEffort.toFixed(1)}/10). Include more easy/recovery sessions — most training should feel easy (RPE 4-6).`);
    } else if (avgEffort < 4) {
      lines.push(`Average effort is low (${avgEffort.toFixed(1)}/10). If you're in a base phase, that's fine. Consider adding a quality session (tempo or intervals) once a week.`);
    } else {
      lines.push(`Effort distribution looks balanced: avg RPE ${avgEffort.toFixed(1)}/10 with ${effortSD < 2 ? "consistent" : "variable"} effort across sessions.`);
    }
  }

  // Activity mix
  const typeCounts: Record<string, number> = {};
  sessions.forEach((s) => { typeCounts[s.type] = (typeCounts[s.type] ?? 0) + 1; });
  const types = Object.keys(typeCounts);
  if (types.length === 1) {
    lines.push(`All sessions are ${types[0]}. Cross-training (strength, cycling, yoga) reduces injury risk and builds overall fitness.`);
  } else {
    lines.push(`Good variety: training includes ${types.join(", ")}.`);
  }

  return lines.join("\n\n");
}

// ── Diet insight engine ───────────────────────────────────────────────────────

function analyzeDiet(entries: {
  date: Date;
  mealType: string;
  calories: number | null;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
}[]): string {
  const lines: string[] = [];

  if (entries.length === 0) {
    return "No nutrition entries in the past 14 days. Start logging meals to get personalized dietary insights!";
  }

  // Aggregate by day
  const byDay: Record<string, { cal: number; protein: number; carbs: number; fat: number; meals: Set<string> }> = {};
  for (const e of entries) {
    const key = dayKey(e.date);
    if (!byDay[key]) byDay[key] = { cal: 0, protein: 0, carbs: 0, fat: 0, meals: new Set() };
    byDay[key].cal += e.calories ?? 0;
    byDay[key].protein += e.protein ?? 0;
    byDay[key].carbs += e.carbs ?? 0;
    byDay[key].fat += e.fat ?? 0;
    byDay[key].meals.add(e.mealType);
  }

  const days = Object.values(byDay);
  const daysLogged = days.length;
  const calPerDay = days.map((d) => d.cal);
  const avgCal = avg(calPerDay);
  const calSD = stddev(calPerDay);

  // Logging consistency
  if (daysLogged < 7) {
    lines.push(`Nutrition logged on only ${daysLogged}/14 days. More consistent logging gives more accurate insights — aim to log every meal every day.`);
  } else {
    lines.push(`Good logging habit: ${daysLogged} days tracked in the past 14 days.`);
  }

  // Calorie consistency
  if (avgCal > 0) {
    const cv = (calSD / avgCal) * 100;
    if (cv > 30) {
      lines.push(`High calorie variability: avg ${Math.round(avgCal)} kcal/day but swinging ±${Math.round(calSD)} kcal. Inconsistent fueling can impact energy and recovery.`);
    } else {
      lines.push(`Calorie intake is consistent: avg ${Math.round(avgCal)} kcal/day (±${Math.round(calSD)} kcal).`);
    }

    if (avgCal < 1600) {
      lines.push(`Average intake (${Math.round(avgCal)} kcal) may be too low for an active athlete. Underfueling impairs training adaptation and recovery.`);
    } else if (avgCal > 3000) {
      lines.push(`Average intake is ${Math.round(avgCal)} kcal/day — on the higher end. Fine if training volume is high, but worth monitoring.`);
    }
  }

  // Macro balance
  const avgProtein = avg(days.map((d) => d.protein));
  const avgCarbs = avg(days.map((d) => d.carbs));
  const avgFat = avg(days.map((d) => d.fat));
  const macroTotal = avgProtein * 4 + avgCarbs * 4 + avgFat * 9;

  if (macroTotal > 100) {
    const proteinPct = (avgProtein * 4 / macroTotal) * 100;
    const carbsPct = (avgCarbs * 4 / macroTotal) * 100;
    const fatPct = (avgFat * 9 / macroTotal) * 100;

    if (proteinPct < 20) {
      lines.push(`Protein intake is low (${proteinPct.toFixed(0)}% of macros, avg ${Math.round(avgProtein)}g/day). Aim for 1.6–2.0g/kg body weight for muscle repair and adaptation.`);
    } else {
      lines.push(`Protein intake looks solid: ${Math.round(avgProtein)}g/day (${proteinPct.toFixed(0)}% of macros).`);
    }

    if (carbsPct < 40) {
      lines.push(`Carbohydrate intake is low (${carbsPct.toFixed(0)}%). Runners need carbs as primary fuel — consider increasing complex carbs around workouts.`);
    }
  }

  // Skipped meals
  const daysSkippingBreakfast = days.filter((d) => !d.meals.has("breakfast")).length;
  if (daysSkippingBreakfast > daysLogged * 0.5) {
    lines.push(`Breakfast is skipped on most logged days. Pre-workout fueling improves performance and reduces muscle breakdown.`);
  }

  return lines.join("\n\n");
}

// ── Overall insight engine ────────────────────────────────────────────────────

function analyzeOverall(
  sessions: { date: Date; duration: number; perceivedEffort: number; type: string }[],
  dietEntries: { date: Date; calories: number | null }[],
  metrics: { date: Date; weight: number | null; sleepHours: number | null; restingHR: number | null; hrv: number | null }[],
  goals: { title: string; completed: boolean; targetValue: number | null; currentValue: number | null }[]
): string {
  const lines: string[] = [];

  // Training load
  const totalLoad = sessions.reduce((s, x) => s + x.duration * x.perceivedEffort, 0);
  const sessionCount = sessions.length;

  // Avg calories
  const calDays: Record<string, number> = {};
  dietEntries.forEach((e) => {
    const k = dayKey(e.date);
    calDays[k] = (calDays[k] ?? 0) + (e.calories ?? 0);
  });
  const calValues = Object.values(calDays);
  const avgCal = calValues.length > 0 ? avg(calValues) : 0;

  // Sleep
  const sleepValues = metrics.filter((m) => m.sleepHours !== null).map((m) => m.sleepHours as number);
  const avgSleep = sleepValues.length > 0 ? avg(sleepValues) : null;

  // HR trend
  const hrValues = metrics.filter((m) => m.restingHR !== null).map((m) => m.restingHR as number);
  const avgHR = hrValues.length > 0 ? avg(hrValues) : null;

  // Weight trend
  const weightVals = metrics.filter((m) => m.weight !== null).map((m) => m.weight as number);
  const weightTrend = weightVals.length >= 2 ? weightVals[weightVals.length - 1] - weightVals[0] : null;

  // Build summary lines
  if (sessionCount === 0) {
    lines.push("No training sessions logged in the past 14 days. Logging your workouts is the first step to improving performance!");
  } else {
    lines.push(`Training overview: ${sessionCount} sessions in 14 days (${(sessionCount / 2).toFixed(1)}/week), total load score ${Math.round(totalLoad)}.`);
  }

  // Fueling vs load
  if (avgCal > 0 && totalLoad > 0) {
    const calPerLoadUnit = avgCal / (totalLoad / 14);
    if (calPerLoadUnit < 5) {
      lines.push(`Potential underfueling: avg ${Math.round(avgCal)} kcal/day against your training load. Active athletes typically need 2000–3000 kcal/day depending on volume.`);
    } else {
      lines.push(`Fueling appears adequate for your training load: avg ${Math.round(avgCal)} kcal/day.`);
    }
  } else if (avgCal === 0) {
    lines.push("Nutrition data not logged — start tracking meals to monitor fueling relative to training load.");
  }

  // Sleep
  if (avgSleep !== null) {
    if (avgSleep < 7) {
      lines.push(`Average sleep is ${avgSleep.toFixed(1)} hrs/night — below the 7-9 hr target for athletes. Sleep is when adaptation happens; poor sleep limits gains and increases injury risk.`);
    } else if (avgSleep >= 8) {
      lines.push(`Excellent sleep: avg ${avgSleep.toFixed(1)} hrs/night. Prioritizing sleep is one of the highest-leverage recovery habits.`);
    } else {
      lines.push(`Sleep is good: avg ${avgSleep.toFixed(1)} hrs/night, within the 7-9 hr optimal range.`);
    }
  } else {
    lines.push("No sleep data logged. Tracking sleep helps correlate recovery quality with training performance.");
  }

  // Resting HR trend
  if (hrValues.length >= 4) {
    const firstHalf = avg(hrValues.slice(0, Math.floor(hrValues.length / 2)));
    const secondHalf = avg(hrValues.slice(Math.floor(hrValues.length / 2)));
    if (secondHalf > firstHalf + 3) {
      lines.push(`Resting HR is trending up (${Math.round(firstHalf)} → ${Math.round(secondHalf)} bpm) — a classic early sign of accumulated fatigue or illness. Consider an easy week.`);
    } else if (secondHalf < firstHalf - 2) {
      lines.push(`Resting HR is trending down (${Math.round(firstHalf)} → ${Math.round(secondHalf)} bpm) — a positive sign of improving cardiovascular fitness.`);
    }
  }

  // Weight trend
  if (weightTrend !== null && Math.abs(weightTrend) > 0.5) {
    if (weightTrend > 1.5) {
      lines.push(`Weight has increased ${weightTrend.toFixed(1)} kg over 14 days. May reflect muscle gain, water retention, or caloric surplus.`);
    } else if (weightTrend < -1.5) {
      lines.push(`Weight has dropped ${Math.abs(weightTrend).toFixed(1)} kg over 14 days. If unintentional, check calorie intake — rapid weight loss can reduce performance.`);
    }
  }

  // Goals
  const activeGoals = goals.filter((g) => !g.completed);
  const nearGoals = activeGoals.filter(
    (g) => g.targetValue && g.currentValue && g.currentValue / g.targetValue >= 0.8
  );
  if (nearGoals.length > 0) {
    lines.push(`Close to goal: you're 80%+ of the way on "${nearGoals[0].title}" — keep the momentum!`);
  } else if (activeGoals.length > 0) {
    lines.push(`You have ${activeGoals.length} active goal${activeGoals.length > 1 ? "s" : ""}. Log your progress regularly to stay on track.`);
  }

  return lines.join("\n\n");
}

// ── Route handler ─────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.user.id;

  try {
    const body = await req.json();
    const { type } = body;

    if (!type || !["training", "diet", "overall"].includes(type)) {
      return NextResponse.json(
        { error: "type must be 'training', 'diet', or 'overall'" },
        { status: 400 }
      );
    }

    const now = new Date();
    const since = new Date(now);
    since.setDate(now.getDate() - 14);
    since.setHours(0, 0, 0, 0);

    let insight = "";

    if (type === "training") {
      const sessions = await prisma.trainingSession.findMany({
        where: { userId, date: { gte: since } },
        orderBy: { date: "asc" },
      });
      insight = analyzeTraining(sessions);
    } else if (type === "diet") {
      const entries = await prisma.dietEntry.findMany({
        where: { userId, date: { gte: since } },
        orderBy: { date: "asc" },
      });
      insight = analyzeDiet(entries);
    } else {
      const [sessions, dietEntries, metrics, goals] = await Promise.all([
        prisma.trainingSession.findMany({ where: { userId, date: { gte: since } }, orderBy: { date: "asc" } }),
        prisma.dietEntry.findMany({ where: { userId, date: { gte: since } }, orderBy: { date: "asc" } }),
        prisma.bodyMetric.findMany({ where: { userId, date: { gte: since } }, orderBy: { date: "asc" } }),
        prisma.goal.findMany({ where: { userId } }),
      ]);
      insight = analyzeOverall(sessions, dietEntries, metrics, goals);
    }

    return NextResponse.json({ insight });
  } catch (err) {
    console.error("[insights POST]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
