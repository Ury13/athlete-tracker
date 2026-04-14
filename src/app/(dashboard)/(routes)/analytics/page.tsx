"use client";

import { useCallback, useEffect, useState } from "react";
import { Sparkles, RefreshCw } from "lucide-react";
import PMCChart from "@/components/charts/PMCChart";
import { SkeletonChart, SkeletonStatCard } from "@/components/ui/LoadingSkeleton";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ReferenceLine,
} from "recharts";
import type { TrainingSession, BodyMetric, DietEntry } from "@/types";

// ── Types ─────────────────────────────────────────────────────────────────────

type RangePreset = "7d" | "30d" | "90d" | "6m" | "1y" | "custom";

interface DateRange {
  from: string;
  to: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

function daysAgo(n: number) {
  return fmtDate(new Date(Date.now() - n * 86400000));
}

function presetToRange(preset: RangePreset): DateRange {
  const to = fmtDate(new Date());
  switch (preset) {
    case "7d":
      return { from: daysAgo(6), to };
    case "30d":
      return { from: daysAgo(29), to };
    case "90d":
      return { from: daysAgo(89), to };
    case "6m":
      return { from: daysAgo(179), to };
    case "1y":
      return { from: daysAgo(364), to };
    default:
      return { from: daysAgo(29), to };
  }
}

/** Exponential Moving Average */
function ema(prev: number, val: number, alpha: number) {
  return alpha * val + (1 - alpha) * prev;
}

/** Build PMC data from sessions */
function buildPMC(sessions: TrainingSession[], from: string, to: string) {
  const fromD = new Date(from + "T00:00:00");
  const toD = new Date(to + "T23:59:59");
  const dayCount =
    Math.ceil((toD.getTime() - fromD.getTime()) / 86400000) + 1;

  // TSS proxy: duration(h) * perceivedEffort * 10
  const tssByDate: Record<string, number> = {};
  sessions.forEach((s) => {
    const key = String(s.date).slice(0, 10);
    const tss = (s.duration / 60) * s.perceivedEffort * 10;
    tssByDate[key] = (tssByDate[key] ?? 0) + tss;
  });

  const alpha7 = 1 - Math.exp(-1 / 7); // ATL
  const alpha42 = 1 - Math.exp(-1 / 42); // CTL

  let ctl = 0;
  let atl = 0;

  return Array.from({ length: dayCount }, (_, i) => {
    const d = new Date(fromD.getTime() + i * 86400000);
    const key = fmtDate(d);
    const tss = tssByDate[key] ?? 0;
    ctl = ema(ctl, tss, alpha42);
    atl = ema(atl, tss, alpha7);
    return {
      date: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      ctl: parseFloat(ctl.toFixed(1)),
      atl: parseFloat(atl.toFixed(1)),
      tsb: parseFloat((ctl - atl).toFixed(1)),
    };
  });
}

/** Weekly mileage */
function buildWeeklyMileage(sessions: TrainingSession[], from: string) {
  const fromD = new Date(from + "T00:00:00");
  const weeks: { week: string; km: number }[] = [];
  let cursor = new Date(fromD);
  // Align to Monday
  const dow = cursor.getDay();
  cursor.setDate(cursor.getDate() - ((dow + 6) % 7));

  while (cursor <= new Date()) {
    const weekStart = fmtDate(cursor);
    const weekEnd = fmtDate(
      new Date(cursor.getTime() + 6 * 86400000)
    );
    const km = sessions
      .filter((s) => {
        const d = String(s.date).slice(0, 10);
        return d >= weekStart && d <= weekEnd && s.distance != null;
      })
      .reduce((sum, s) => sum + (s.distance ?? 0), 0);
    weeks.push({
      week: cursor.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      }),
      km: parseFloat(km.toFixed(1)),
    });
    cursor.setDate(cursor.getDate() + 7);
  }
  return weeks;
}

/** Activity distribution */
function buildActivityDist(sessions: TrainingSession[]) {
  const counts: Record<string, number> = {};
  sessions.forEach((s) => {
    counts[s.type] = (counts[s.type] ?? 0) + 1;
  });
  return Object.entries(counts).map(([name, value]) => ({ name, value }));
}

const ACTIVITY_COLORS: Record<string, string> = {
  run: "#3b82f6",
  bike: "#22c55e",
  swim: "#06b6d4",
  strength: "#f97316",
  yoga: "#a855f7",
  other: "#94a3b8",
};

/** Daily calories + macro area data */
function buildNutritionData(
  entries: DietEntry[],
  from: string,
  to: string
) {
  const fromD = new Date(from + "T00:00:00");
  const toD = new Date(to + "T23:59:59");
  const dayCount =
    Math.ceil((toD.getTime() - fromD.getTime()) / 86400000) + 1;

  return Array.from({ length: dayCount }, (_, i) => {
    const d = new Date(fromD.getTime() + i * 86400000);
    const key = fmtDate(d);
    const dayEntries = entries.filter(
      (e) => String(e.date).slice(0, 10) === key
    );
    return {
      date: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      calories: dayEntries.reduce((s, e) => s + (e.calories ?? 0), 0),
      protein: parseFloat(
        dayEntries.reduce((s, e) => s + (e.protein ?? 0), 0).toFixed(1)
      ),
      carbs: parseFloat(
        dayEntries.reduce((s, e) => s + (e.carbs ?? 0), 0).toFixed(1)
      ),
      fat: parseFloat(
        dayEntries.reduce((s, e) => s + (e.fat ?? 0), 0).toFixed(1)
      ),
    };
  });
}

/** Metrics timeline */
function buildMetricsData(metrics: BodyMetric[], from: string, to: string) {
  const fromD = new Date(from + "T00:00:00");
  const toD = new Date(to + "T23:59:59");
  const dayCount =
    Math.ceil((toD.getTime() - fromD.getTime()) / 86400000) + 1;

  return Array.from({ length: dayCount }, (_, i) => {
    const d = new Date(fromD.getTime() + i * 86400000);
    const key = fmtDate(d);
    const entry = metrics.find((m) => String(m.date).slice(0, 10) === key);
    return {
      date: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      weight: entry?.weight ?? null,
      sleepHours: entry?.sleepHours ?? null,
      restingHR: entry?.restingHR ?? null,
    };
  });
}

// ── Section title ─────────────────────────────────────────────────────────────

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-slate-800 border-b border-slate-100 pb-2">{children}</h2>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function AnalyticsPage() {
  const [preset, setPreset] = useState<RangePreset>("30d");
  const [customFrom, setCustomFrom] = useState(daysAgo(29));
  const [customTo, setCustomTo] = useState(fmtDate(new Date()));

  const range: DateRange =
    preset === "custom"
      ? { from: customFrom, to: customTo }
      : presetToRange(preset);

  const [sessions, setSessions] = useState<TrainingSession[]>([]);
  const [dietEntries, setDietEntries] = useState<DietEntry[]>([]);
  const [metricsData, setMetricsData] = useState<BodyMetric[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // AI Insights
  const [insight, setInsight] = useState<string | null>(null);
  const [insightLoading, setInsightLoading] = useState(false);

  // ── Fetch ──────────────────────────────────────────────────────────────────

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [sRes, dRes, mRes] = await Promise.all([
        fetch(`/api/training?from=${range.from}&to=${range.to}`),
        fetch(`/api/diet?from=${range.from}&to=${range.to}`),
        fetch(`/api/metrics?from=${range.from}&to=${range.to}`),
      ]);

      if (sRes.ok) {
        const d = await sRes.json();
        setSessions(d.data ?? d ?? []);
      }
      if (dRes.ok) {
        const d = await dRes.json();
        setDietEntries(d.data ?? d ?? []);
      }
      if (mRes.ok) {
        const d = await mRes.json();
        setMetricsData(d.data ?? d ?? []);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [range.from, range.to]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  async function generateInsights() {
    setInsightLoading(true);
    try {
      const res = await fetch("/api/ai/insights", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "overall",
          data: {
            sessions: sessions.slice(0, 20),
            dietSummary: {
              avgCalories:
                dietEntries.length > 0
                  ? Math.round(
                      dietEntries.reduce(
                        (sum, e) => sum + (e.calories ?? 0),
                        0
                      ) / Math.max(1, Array.from(new Set(dietEntries.map((e) => String(e.date).slice(0, 10)))).length)
                    )
                  : null,
            },
            metrics: metricsData.slice(-7),
          },
        }),
      });
      if (!res.ok) throw new Error("AI insight failed");
      const data = await res.json();
      setInsight(data.insight ?? data.data?.insight ?? "No insight returned.");
    } catch (err) {
      setInsight("Could not generate insights. Please try again.");
    } finally {
      setInsightLoading(false);
    }
  }

  // ── Chart data ─────────────────────────────────────────────────────────────

  const pmcData = buildPMC(sessions, range.from, range.to);
  const weeklyMileage = buildWeeklyMileage(sessions, range.from);
  const activityDist = buildActivityDist(sessions);
  const nutritionData = buildNutritionData(dietEntries, range.from, range.to);
  const metricsChartData = buildMetricsData(metricsData, range.from, range.to);

  const PRESETS: { value: RangePreset; label: string }[] = [
    { value: "7d", label: "7d" },
    { value: "30d", label: "30d" },
    { value: "90d", label: "90d" },
    { value: "6m", label: "6m" },
    { value: "1y", label: "1y" },
    { value: "custom", label: "Custom" },
  ];

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="p-5 md:p-8 max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-slate-900">Analytics</h1>
        <p className="text-slate-500 text-sm mt-0.5">
          Deep dive into your performance data
        </p>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Date range selector */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex gap-1 bg-slate-100 p-1 rounded-xl">
          {PRESETS.map((p) => (
            <button
              key={p.value}
              onClick={() => setPreset(p.value)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                preset === p.value
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
        {preset === "custom" && (
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={customFrom}
              max={customTo}
              onChange={(e) => setCustomFrom(e.target.value)}
              className="input w-36 text-sm"
            />
            <span className="text-slate-400 text-sm">to</span>
            <input
              type="date"
              value={customTo}
              min={customFrom}
              max={fmtDate(new Date())}
              onChange={(e) => setCustomTo(e.target.value)}
              className="input w-36 text-sm"
            />
          </div>
        )}
      </div>

      {/* ── Section 1: Training Load ─────────────────────────────────────────── */}
      <section className="space-y-4">
        <SectionTitle>Training Load</SectionTitle>

        {/* PMC Chart */}
        <div className="card p-5">
          <div className="mb-1">
            <h3 className="text-slate-700">Performance Management Chart</h3>
            <p className="text-xs text-slate-400 mt-0.5">
              CTL (fitness, 42-day EMA) · ATL (fatigue, 7-day EMA) · TSB (form = CTL − ATL)
            </p>
          </div>
          {loading ? (
            <SkeletonChart height="h-64" />
          ) : (
            <PMCChart data={pmcData} />
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Weekly mileage */}
          <div className="card p-5">
            <h3 className="text-slate-700 mb-3">Weekly Mileage</h3>
            {loading ? (
              <SkeletonChart height="h-48" />
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart
                  data={weeklyMileage}
                  margin={{ top: 4, right: 4, left: -20, bottom: 0 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="#f1f5f9"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="week"
                    tick={{ fontSize: 11, fill: "#94a3b8" }}
                    axisLine={false}
                    tickLine={false}
                    interval="preserveStartEnd"
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: "#94a3b8" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "#0f172a",
                      border: "none",
                      borderRadius: "8px",
                      color: "#f8fafc",
                      fontSize: 12,
                    }}
                    formatter={(v: number) => [`${v} km`, "Distance"]}
                  />
                  <Bar
                    dataKey="km"
                    fill="#14b8a6"
                    radius={[4, 4, 0, 0]}
                    maxBarSize={40}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Activity distribution pie */}
          <div className="card p-5">
            <h3 className="text-slate-700 mb-3">Activity Distribution</h3>
            {loading ? (
              <SkeletonChart height="h-48" />
            ) : activityDist.length === 0 ? (
              <div className="h-48 flex items-center justify-center text-slate-400 text-sm">
                No sessions in this period
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={activityDist}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={75}
                    paddingAngle={3}
                    dataKey="value"
                    nameKey="name"
                  >
                    {activityDist.map((entry, idx) => (
                      <Cell
                        key={idx}
                        fill={
                          ACTIVITY_COLORS[entry.name] ?? ACTIVITY_COLORS.other
                        }
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      background: "#0f172a",
                      border: "none",
                      borderRadius: "8px",
                      color: "#f8fafc",
                      fontSize: 12,
                    }}
                    formatter={(v: number, name: string) => [
                      `${v} session${v !== 1 ? "s" : ""}`,
                      name.charAt(0).toUpperCase() + name.slice(1),
                    ]}
                  />
                  <Legend
                    iconType="circle"
                    wrapperStyle={{ fontSize: 12 }}
                    formatter={(v: string) =>
                      v.charAt(0).toUpperCase() + v.slice(1)
                    }
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </section>

      {/* ── Section 2: Nutrition Trends ─────────────────────────────────────── */}
      <section className="space-y-4">
        <SectionTitle>Nutrition Trends</SectionTitle>

        {/* Calorie intake line chart */}
        <div className="card p-5">
          <h3 className="text-slate-700 mb-3">Daily Calorie Intake</h3>
          {loading ? (
            <SkeletonChart height="h-52" />
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart
                data={nutritionData}
                margin={{ top: 4, right: 4, left: -20, bottom: 0 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#f1f5f9"
                  vertical={false}
                />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11, fill: "#94a3b8" }}
                  axisLine={false}
                  tickLine={false}
                  interval="preserveStartEnd"
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "#94a3b8" }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={{
                    background: "#0f172a",
                    border: "none",
                    borderRadius: "8px",
                    color: "#f8fafc",
                    fontSize: 12,
                  }}
                  formatter={(v: number) => [`${v} kcal`, "Calories"]}
                />
                <ReferenceLine
                  y={2000}
                  stroke="#14b8a6"
                  strokeDasharray="4 4"
                  label={{
                    value: "Target 2000",
                    position: "right",
                    fontSize: 10,
                    fill: "#14b8a6",
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="calories"
                  stroke="#14b8a6"
                  strokeWidth={2}
                  dot={false}
                  connectNulls
                  activeDot={{ r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Macro stacked area */}
        <div className="card p-5">
          <h3 className="text-slate-700 mb-3">Macro Trends (grams/day)</h3>
          {loading ? (
            <SkeletonChart height="h-52" />
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart
                data={nutritionData}
                margin={{ top: 4, right: 4, left: -20, bottom: 0 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#f1f5f9"
                  vertical={false}
                />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11, fill: "#94a3b8" }}
                  axisLine={false}
                  tickLine={false}
                  interval="preserveStartEnd"
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "#94a3b8" }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={{
                    background: "#0f172a",
                    border: "none",
                    borderRadius: "8px",
                    color: "#f8fafc",
                    fontSize: 12,
                  }}
                />
                <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
                <Area
                  type="monotone"
                  dataKey="protein"
                  name="Protein (g)"
                  stackId="macros"
                  stroke="#3b82f6"
                  fill="#3b82f6"
                  fillOpacity={0.6}
                />
                <Area
                  type="monotone"
                  dataKey="carbs"
                  name="Carbs (g)"
                  stackId="macros"
                  stroke="#f59e0b"
                  fill="#f59e0b"
                  fillOpacity={0.6}
                />
                <Area
                  type="monotone"
                  dataKey="fat"
                  name="Fat (g)"
                  stackId="macros"
                  stroke="#ef4444"
                  fill="#ef4444"
                  fillOpacity={0.6}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </section>

      {/* ── Section 3: Body Metrics ──────────────────────────────────────────── */}
      <section className="space-y-4">
        <SectionTitle>Body Metrics Trends</SectionTitle>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Weight + Sleep dual axis */}
          <div className="card p-5">
            <h3 className="text-slate-700 mb-3">Weight & Sleep</h3>
            {loading ? (
              <SkeletonChart height="h-52" />
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <LineChart
                  data={metricsChartData}
                  margin={{ top: 4, right: 4, left: -20, bottom: 0 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="#f1f5f9"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 11, fill: "#94a3b8" }}
                    axisLine={false}
                    tickLine={false}
                    interval="preserveStartEnd"
                  />
                  <YAxis
                    yAxisId="weight"
                    tick={{ fontSize: 11, fill: "#94a3b8" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    yAxisId="sleep"
                    orientation="right"
                    domain={[0, 12]}
                    tick={{ fontSize: 11, fill: "#94a3b8" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "#0f172a",
                      border: "none",
                      borderRadius: "8px",
                      color: "#f8fafc",
                      fontSize: 12,
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
                  <Line
                    yAxisId="weight"
                    type="monotone"
                    dataKey="weight"
                    name="Weight (kg)"
                    stroke="#14b8a6"
                    strokeWidth={2}
                    dot={false}
                    connectNulls
                    activeDot={{ r: 4 }}
                  />
                  <Line
                    yAxisId="sleep"
                    type="monotone"
                    dataKey="sleepHours"
                    name="Sleep (hrs)"
                    stroke="#8b5cf6"
                    strokeWidth={2}
                    dot={false}
                    connectNulls
                    activeDot={{ r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Resting HR */}
          <div className="card p-5">
            <h3 className="text-slate-700 mb-3">Resting Heart Rate</h3>
            {loading ? (
              <SkeletonChart height="h-52" />
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <LineChart
                  data={metricsChartData}
                  margin={{ top: 4, right: 4, left: -20, bottom: 0 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="#f1f5f9"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 11, fill: "#94a3b8" }}
                    axisLine={false}
                    tickLine={false}
                    interval="preserveStartEnd"
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: "#94a3b8" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "#0f172a",
                      border: "none",
                      borderRadius: "8px",
                      color: "#f8fafc",
                      fontSize: 12,
                    }}
                    formatter={(v: number) => [`${v} bpm`, "Resting HR"]}
                  />
                  <Line
                    type="monotone"
                    dataKey="restingHR"
                    name="Resting HR (bpm)"
                    stroke="#ef4444"
                    strokeWidth={2}
                    dot={false}
                    connectNulls
                    activeDot={{ r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </section>

      {/* ── Section 4: AI Insights ───────────────────────────────────────────── */}
      <section className="space-y-4">
        <SectionTitle>AI Insights</SectionTitle>

        <div className="card p-6">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h3 className="text-slate-800 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-brand-500" />
                Personalized Insights
              </h3>
              <p className="text-sm text-slate-500 mt-1">
                AI analysis of your training, nutrition, and recovery data
              </p>
            </div>
            <button
              onClick={generateInsights}
              disabled={insightLoading || loading}
              className="btn-primary flex-shrink-0"
            >
              {insightLoading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Generate Insights
                </>
              )}
            </button>
          </div>

          {insightLoading && (
            <div className="mt-5 space-y-2 animate-pulse">
              <div className="h-4 bg-slate-200 rounded w-full" />
              <div className="h-4 bg-slate-200 rounded w-5/6" />
              <div className="h-4 bg-slate-200 rounded w-4/6" />
            </div>
          )}

          {insight && !insightLoading && (
            <div className="mt-5 rounded-xl bg-brand-50 border border-brand-200 p-4">
              <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
                {insight}
              </p>
            </div>
          )}

          {!insight && !insightLoading && (
            <div className="mt-5 py-8 text-center text-slate-400">
              <Sparkles className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p className="text-sm">
                Click &quot;Generate Insights&quot; to get AI-powered feedback on your data
              </p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
