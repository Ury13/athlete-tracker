"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Scale } from "lucide-react";
import WeightTrendChart from "@/components/charts/WeightTrendChart";
import { SkeletonChart, SkeletonStatCard } from "@/components/ui/LoadingSkeleton";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import type { BodyMetric } from "@/types";

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

function shiftDate(dateStr: string, days: number): string {
  const d = new Date(dateStr + "T12:00:00");
  d.setDate(d.getDate() + days);
  return fmtDate(d);
}

function avg(vals: (number | null | undefined)[]): number | null {
  const nums = vals.filter((v) => v != null) as number[];
  return nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : null;
}

// ── Metric Input ──────────────────────────────────────────────────────────────

function MetricInput({
  label,
  value,
  unit,
  step = "0.1",
  min = "0",
  onSave,
}: {
  label: string;
  value: string;
  unit: string;
  step?: string;
  min?: string;
  onSave: (val: string) => void;
}) {
  const [local, setLocal] = useState(value);
  const prevRef = useRef(value);

  useEffect(() => {
    setLocal(value);
    prevRef.current = value;
  }, [value]);

  function handleBlur() {
    if (local !== prevRef.current) {
      prevRef.current = local;
      onSave(local);
    }
  }

  return (
    <div className="text-center">
      <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">
        {label}
      </p>
      <div className="flex items-center justify-center gap-1">
        <input
          type="number"
          step={step}
          min={min}
          value={local}
          onChange={(e) => setLocal(e.target.value)}
          onBlur={handleBlur}
          className="w-20 text-center border border-slate-200 rounded-lg px-2 py-1.5 text-lg font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
          placeholder="—"
        />
        <span className="text-sm text-slate-400">{unit}</span>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function MetricsPage() {
  const [selectedDate, setSelectedDate] = useState(fmtDate(new Date()));
  const [metrics, setMetrics] = useState<BodyMetric[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Current day metric values (editable)
  const [weight, setWeight] = useState("");
  const [restingHR, setRestingHR] = useState("");
  const [sleepHours, setSleepHours] = useState("");
  const [sleepQuality, setSleepQuality] = useState("");
  const [hrv, setHrv] = useState("");

  // ── Fetch ──────────────────────────────────────────────────────────────────

  const fetchMetrics = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const thirtyAgo = fmtDate(new Date(Date.now() - 29 * 86400000));
      const res = await fetch(`/api/metrics?from=${thirtyAgo}&to=${fmtDate(new Date())}`);
      if (!res.ok) throw new Error("Failed to load metrics");
      const data = await res.json();
      const list: BodyMetric[] = data.data ?? data ?? [];
      setMetrics(list);

      // Set current day values
      const todayEntry = list.find(
        (m) => String(m.date).slice(0, 10) === selectedDate
      );
      setWeight(todayEntry?.weight?.toString() ?? "");
      setRestingHR(todayEntry?.restingHR?.toString() ?? "");
      setSleepHours(todayEntry?.sleepHours?.toString() ?? "");
      setSleepQuality(todayEntry?.sleepQuality?.toString() ?? "");
      setHrv(todayEntry?.hrv?.toString() ?? "");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [selectedDate]);

  useEffect(() => {
    fetchMetrics();
  }, [fetchMetrics]);

  // ── Auto-save ──────────────────────────────────────────────────────────────

  async function saveField(field: string, value: string) {
    if (value === "") return;
    try {
      const body: Record<string, unknown> = {
        date: selectedDate,
        [field]: field.includes("HR") || field === "hrv" || field === "sleepQuality"
          ? parseInt(value, 10)
          : parseFloat(value),
      };
      const res = await fetch("/api/metrics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("Save failed");
      // Refresh data
      await fetchMetrics();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    }
  }

  // ── Chart data ─────────────────────────────────────────────────────────────

  const chartData = Array.from({ length: 30 }, (_, i) => {
    const d = new Date(Date.now() - (29 - i) * 86400000);
    const key = fmtDate(d);
    const entry = metrics.find((m) => String(m.date).slice(0, 10) === key);
    return {
      date: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      weight: entry?.weight ?? null,
      restingHR: entry?.restingHR ?? null,
      hrv: entry?.hrv ?? null,
      sleepHours: entry?.sleepHours ?? null,
      sleepQuality: entry?.sleepQuality ?? null,
    };
  });

  // 30-day averages
  const avgWeight = avg(metrics.map((m) => m.weight));
  const avgHR = avg(metrics.map((m) => m.restingHR));
  const avgSleep = avg(metrics.map((m) => m.sleepHours));
  const avgHRV = avg(metrics.map((m) => m.hrv));

  const isToday = selectedDate === fmtDate(new Date());

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="p-5 md:p-8 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-slate-900">Body Metrics</h1>
        <p className="text-slate-500 text-sm mt-0.5">
          Track weight, sleep, heart rate, and recovery
        </p>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Date navigation */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => setSelectedDate(shiftDate(selectedDate, -1))}
          className="p-2 rounded-lg border border-slate-200 hover:bg-slate-100 transition-colors"
          aria-label="Previous day"
        >
          <ChevronLeft className="w-4 h-4 text-slate-600" />
        </button>
        <input
          type="date"
          value={selectedDate}
          max={fmtDate(new Date())}
          onChange={(e) => setSelectedDate(e.target.value)}
          className="input w-40"
        />
        <button
          onClick={() => !isToday && setSelectedDate(shiftDate(selectedDate, 1))}
          disabled={isToday}
          className="p-2 rounded-lg border border-slate-200 hover:bg-slate-100 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          aria-label="Next day"
        >
          <ChevronRight className="w-4 h-4 text-slate-600" />
        </button>
        {!isToday && (
          <button
            onClick={() => setSelectedDate(fmtDate(new Date()))}
            className="text-sm text-brand-600 hover:text-brand-700 font-medium"
          >
            Today
          </button>
        )}
      </div>

      {/* Today's metrics card */}
      <div className="card p-6">
        <div className="flex items-center gap-2 mb-5">
          <Scale className="w-5 h-5 text-brand-500" />
          <h2 className="text-slate-800">
            {isToday ? "Today's Metrics" : "Metrics for"}{" "}
            {!isToday &&
              new Date(selectedDate + "T12:00:00").toLocaleDateString("en-US", {
                weekday: "short",
                month: "short",
                day: "numeric",
              })}
          </h2>
          <span className="text-xs text-slate-400 ml-auto">
            Values auto-save on blur
          </span>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <SkeletonStatCard key={i} />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
            <MetricInput
              label="Weight"
              value={weight}
              unit="kg"
              onSave={(v) => {
                setWeight(v);
                saveField("weight", v);
              }}
            />
            <MetricInput
              label="Resting HR"
              value={restingHR}
              unit="bpm"
              step="1"
              onSave={(v) => {
                setRestingHR(v);
                saveField("restingHR", v);
              }}
            />
            <MetricInput
              label="Sleep"
              value={sleepHours}
              unit="hrs"
              onSave={(v) => {
                setSleepHours(v);
                saveField("sleepHours", v);
              }}
            />
            <MetricInput
              label="Sleep Quality"
              value={sleepQuality}
              unit="/10"
              step="1"
              min="1"
              onSave={(v) => {
                setSleepQuality(v);
                saveField("sleepQuality", v);
              }}
            />
            <MetricInput
              label="HRV"
              value={hrv}
              unit="ms"
              step="1"
              onSave={(v) => {
                setHrv(v);
                saveField("hrv", v);
              }}
            />
          </div>
        )}
      </div>

      {/* 30-day averages */}
      <div>
        <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">
          30-Day Averages
        </h2>
        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <SkeletonStatCard key={i} />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: "Avg Weight", value: avgWeight?.toFixed(1), unit: "kg" },
              { label: "Avg Resting HR", value: avgHR?.toFixed(0), unit: "bpm" },
              { label: "Avg Sleep", value: avgSleep?.toFixed(1), unit: "hrs" },
              { label: "Avg HRV", value: avgHRV?.toFixed(0), unit: "ms" },
            ].map((stat) => (
              <div key={stat.label} className="card p-4">
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                  {stat.label}
                </p>
                <p className="text-2xl font-bold text-slate-900 mt-1">
                  {stat.value ?? "—"}
                  {stat.value && (
                    <span className="text-sm font-normal text-slate-500 ml-1">
                      {stat.unit}
                    </span>
                  )}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Charts */}
      <div className="space-y-5">
        {/* Weight trend */}
        <div className="card p-5">
          <h2 className="text-slate-800 mb-4">Weight — 30 Days</h2>
          {loading ? (
            <SkeletonChart height="h-52" />
          ) : (
            <WeightTrendChart data={chartData} />
          )}
        </div>

        {/* Resting HR + HRV */}
        <div className="card p-5">
          <h2 className="text-slate-800 mb-4">Resting HR & HRV — 30 Days</h2>
          {loading ? (
            <SkeletonChart height="h-52" />
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart
                data={chartData}
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
                <Line
                  type="monotone"
                  dataKey="hrv"
                  name="HRV (ms)"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  dot={false}
                  connectNulls
                  activeDot={{ r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Sleep */}
        <div className="card p-5">
          <h2 className="text-slate-800 mb-4">Sleep — 30 Days</h2>
          {loading ? (
            <SkeletonChart height="h-52" />
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart
                data={chartData}
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
                  yAxisId="hours"
                  tick={{ fontSize: 11, fill: "#94a3b8" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  yAxisId="quality"
                  orientation="right"
                  domain={[0, 10]}
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
                <Bar
                  yAxisId="hours"
                  dataKey="sleepHours"
                  name="Sleep Hours"
                  fill="#8b5cf6"
                  radius={[3, 3, 0, 0]}
                  maxBarSize={20}
                />
                <Line
                  yAxisId="quality"
                  type="monotone"
                  dataKey="sleepQuality"
                  name="Sleep Quality (1-10)"
                  stroke="#f59e0b"
                  strokeWidth={2}
                  dot={false}
                  connectNulls
                  activeDot={{ r: 4 }}
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
}
