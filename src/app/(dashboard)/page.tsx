"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Activity,
  Dumbbell,
  Utensils,
  Scale,
  Target,
  Plus,
  Moon,
} from "lucide-react";
import StatCard from "@/components/ui/StatCard";
import { SkeletonStatCard, SkeletonCard, SkeletonChart } from "@/components/ui/LoadingSkeleton";
import WeeklyCaloriesChart from "@/components/charts/WeeklyCaloriesChart";
import type { TrainingSession, WeeklySummary } from "@/types";

// ── Helpers ──────────────────────────────────────────────────────────────────

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h > 0 ? `${h}h ${m.toString().padStart(2, "0")}m` : `${m}m`;
}

const typeColors: Record<string, string> = {
  run: "text-blue-600 bg-blue-50",
  bike: "text-green-600 bg-green-50",
  swim: "text-cyan-600 bg-cyan-50",
  strength: "text-orange-600 bg-orange-50",
  yoga: "text-purple-600 bg-purple-50",
  other: "text-slate-600 bg-slate-100",
};

const typeLabels: Record<string, string> = {
  run: "Run",
  bike: "Ride",
  swim: "Swim",
  strength: "Strength",
  yoga: "Yoga",
  other: "Other",
};

// Build last-7-days calorie array from diet data
function buildWeekCalories(
  dietEntries: { date: string; calories: number }[]
): { day: string; calories: number }[] {
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const result: { day: string; calories: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    const dayName = days[d.getDay()];
    const cal = dietEntries
      .filter((e) => e.date.slice(0, 10) === key)
      .reduce((sum, e) => sum + (e.calories ?? 0), 0);
    result.push({ day: dayName, calories: cal });
  }
  return result;
}

// ── Component ────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const [userName, setUserName] = useState<string | null>(null);
  const [summary, setSummary] = useState<WeeklySummary | null>(null);
  const [recentSessions, setRecentSessions] = useState<TrainingSession[]>([]);
  const [weekCalories, setWeekCalories] = useState<
    { day: string; calories: number }[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const [summaryRes, sessionsRes, dietRes] = await Promise.all([
          fetch("/api/dashboard/summary"),
          fetch("/api/training?limit=5"),
          fetch(
            `/api/diet?from=${new Date(Date.now() - 6 * 86400000)
              .toISOString()
              .slice(0, 10)}&to=${new Date().toISOString().slice(0, 10)}`
          ),
        ]);

        if (!summaryRes.ok) throw new Error("Failed to load summary");
        const summaryData = await summaryRes.json();
        setSummary(summaryData.data ?? summaryData);

        if (sessionsRes.ok) {
          const sData = await sessionsRes.json();
          setRecentSessions(sData.data ?? sData ?? []);
        }

        if (dietRes.ok) {
          const dData = await dietRes.json();
          const entries = (dData.data ?? dData ?? []) as {
            date: string;
            calories: number;
          }[];
          setWeekCalories(buildWeekCalories(entries));
        }

        // Fetch session user name via NextAuth session endpoint
        try {
          const sessionRes = await fetch("/api/auth/session");
          if (sessionRes.ok) {
            const sessionData = await sessionRes.json();
            setUserName(sessionData?.user?.name ?? null);
          }
        } catch {
          // ignore
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const firstName = userName?.split(" ")[0] ?? "Athlete";

  return (
    <div className="p-5 md:p-8 max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-slate-900">
          {getGreeting()}, {firstName}
        </h1>
        <p className="text-slate-500 text-sm mt-1">
          {new Date().toLocaleDateString("en-US", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
        </p>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Summary cards */}
      <section>
        <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">
          This Week
        </h2>
        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <SkeletonStatCard key={i} />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            <StatCard
              label="Distance"
              value={summary?.training?.totalDistance?.toFixed(1) ?? "—"}
              unit="km"
              icon={<Activity className="w-4 h-4" />}
            />
            <StatCard
              label="Sessions"
              value={summary?.training?.totalSessions ?? "—"}
              icon={<Dumbbell className="w-4 h-4" />}
            />
            <StatCard
              label="Avg Calories"
              value={
                summary?.diet?.avgCaloriesPerDay
                  ? Math.round(summary.diet.avgCaloriesPerDay)
                  : "—"
              }
              unit="kcal"
              icon={<Utensils className="w-4 h-4" />}
            />
            <StatCard
              label="Avg Sleep"
              value={
                summary?.metrics?.avgSleepHours
                  ? summary.metrics.avgSleepHours.toFixed(1)
                  : "—"
              }
              unit="hrs"
              icon={<Moon className="w-4 h-4" />}
            />
            <StatCard
              label="Active Goals"
              value={"—"}
              icon={<Target className="w-4 h-4" />}
              highlight
            />
          </div>
        )}
      </section>

      {/* Two-column content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Training */}
        <section className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-slate-800">Recent Training</h2>
            <Link
              href="/training"
              className="text-xs text-brand-600 hover:text-brand-700 font-medium"
            >
              View all
            </Link>
          </div>
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <SkeletonCard key={i} />
              ))}
            </div>
          ) : recentSessions.length === 0 ? (
            <div className="py-8 text-center text-slate-400 text-sm">
              <Dumbbell className="w-8 h-8 mx-auto mb-2 opacity-30" />
              No sessions yet — log your first workout!
            </div>
          ) : (
            <div className="space-y-2">
              {recentSessions.map((s) => {
                const colorClass =
                  typeColors[s.type as string] ?? typeColors.other;
                return (
                  <div
                    key={s.id}
                    className="flex items-center gap-3 py-2 border-b border-slate-50 last:border-0"
                  >
                    <div
                      className={`flex-shrink-0 w-8 h-8 rounded-lg ${colorClass} flex items-center justify-center`}
                    >
                      <Activity className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-800">
                        {typeLabels[s.type as string] ?? s.type}
                      </p>
                      <p className="text-xs text-slate-500">
                        {new Date(s.date).toLocaleDateString("en-US", {
                          weekday: "short",
                          month: "short",
                          day: "numeric",
                        })}
                      </p>
                    </div>
                    <div className="text-right text-xs text-slate-600">
                      {s.distance != null && (
                        <p className="font-medium">{s.distance.toFixed(1)} km</p>
                      )}
                      <p className="text-slate-400">{formatDuration(s.duration)}</p>
                    </div>
                    <div className="flex gap-0.5 flex-shrink-0">
                      {Array.from({ length: 10 }, (_, i) => (
                        <span
                          key={i}
                          className={`w-1.5 h-1.5 rounded-full ${
                            i < s.perceivedEffort ? "bg-brand-400" : "bg-slate-200"
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Weekly Nutrition Chart */}
        <section className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-slate-800">This Week&apos;s Nutrition</h2>
            <Link
              href="/diet"
              className="text-xs text-brand-600 hover:text-brand-700 font-medium"
            >
              View all
            </Link>
          </div>
          {loading ? (
            <SkeletonChart height="h-52" />
          ) : (
            <WeeklyCaloriesChart data={weekCalories} target={2000} />
          )}
        </section>
      </div>

      {/* Quick log buttons */}
      <section>
        <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">
          Quick Log
        </h2>
        <div className="flex flex-wrap gap-3">
          <Link href="/training" className="btn-primary">
            <Plus className="w-4 h-4" />
            Log Run
          </Link>
          <Link href="/diet" className="btn-secondary">
            <Plus className="w-4 h-4" />
            Log Meal
          </Link>
          <Link href="/metrics" className="btn-secondary">
            <Plus className="w-4 h-4" />
            Log Metrics
          </Link>
        </div>
      </section>
    </div>
  );
}
