"use client";

import { useCallback, useEffect, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Utensils,
  ChevronDown,
  ChevronUp,
  Trash2,
} from "lucide-react";
import Modal from "@/components/ui/Modal";
import WeeklyCaloriesChart from "@/components/charts/WeeklyCaloriesChart";
import { SkeletonLine, SkeletonChart } from "@/components/ui/LoadingSkeleton";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import type { DietEntry, MealType } from "@/types";

// ── Constants ─────────────────────────────────────────────────────────────────

const MEAL_TYPES: { value: MealType; label: string; icon: string }[] = [
  { value: "breakfast", label: "Breakfast", icon: "☀️" },
  { value: "lunch", label: "Lunch", icon: "🥗" },
  { value: "dinner", label: "Dinner", icon: "🍽️" },
  { value: "snack", label: "Snacks", icon: "🍎" },
];

const TARGETS = {
  calories: 2000,
  protein: 150,
  carbs: 250,
  fat: 70,
};

const MACRO_COLORS = {
  protein: "#3b82f6",
  carbs: "#f59e0b",
  fat: "#ef4444",
};

interface FoodForm {
  date: string;
  mealType: MealType;
  foodName: string;
  calories: string;
  protein: string;
  carbs: string;
  fat: string;
  fiber: string;
  notes: string;
}

const defaultForm = (date: string, meal: MealType): FoodForm => ({
  date,
  mealType: meal,
  foodName: "",
  calories: "",
  protein: "",
  carbs: "",
  fat: "",
  fiber: "",
  notes: "",
});

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function prevDay(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00");
  d.setDate(d.getDate() - 1);
  return formatDate(d);
}

function nextDay(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00");
  d.setDate(d.getDate() + 1);
  return formatDate(d);
}

function buildWeekCalories(
  entries: DietEntry[]
): { day: string; calories: number }[] {
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const key = formatDate(d);
    const cal = entries
      .filter((e) => String(e.date).slice(0, 10) === key)
      .reduce((sum, e) => sum + (e.calories ?? 0), 0);
    return { day: days[d.getDay()], calories: cal };
  });
}

interface DailySummary {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

function summarise(entries: DietEntry[]): DailySummary {
  return entries.reduce(
    (acc, e) => ({
      calories: acc.calories + (e.calories ?? 0),
      protein: acc.protein + (e.protein ?? 0),
      carbs: acc.carbs + (e.carbs ?? 0),
      fat: acc.fat + (e.fat ?? 0),
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function ProgressBar({
  label,
  value,
  target,
  color,
  unit,
}: {
  label: string;
  value: number;
  target: number;
  color: string;
  unit: string;
}) {
  const pct = Math.min(100, Math.round((value / target) * 100));
  return (
    <div>
      <div className="flex justify-between text-xs text-slate-600 mb-1">
        <span>{label}</span>
        <span>
          {Math.round(value)}{unit} / {target}{unit}{" "}
          <span className="text-slate-400">({pct}%)</span>
        </span>
      </div>
      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-300"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}

function MealSection({
  meal,
  entries,
  onAdd,
  onDelete,
}: {
  meal: { value: MealType; label: string; icon: string };
  entries: DietEntry[];
  onAdd: (meal: MealType) => void;
  onDelete: (id: string) => void;
}) {
  const [open, setOpen] = useState(true);
  const subtotals = summarise(entries);

  return (
    <div className="card overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="text-lg">{meal.icon}</span>
          <span className="font-semibold text-slate-800">{meal.label}</span>
          {entries.length > 0 && (
            <span className="text-xs text-slate-400">
              {Math.round(subtotals.calories)} kcal
            </span>
          )}
        </div>
        {open ? (
          <ChevronUp className="w-4 h-4 text-slate-400" />
        ) : (
          <ChevronDown className="w-4 h-4 text-slate-400" />
        )}
      </button>

      {open && (
        <div className="border-t border-slate-100">
          {entries.length === 0 ? (
            <p className="px-4 py-3 text-sm text-slate-400 italic">
              No items yet
            </p>
          ) : (
            <div className="divide-y divide-slate-50">
              {entries.map((e) => (
                <div
                  key={e.id}
                  className="px-4 py-2.5 flex items-start justify-between gap-2"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800 truncate">
                      {e.foodName}
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {e.calories != null && `${e.calories} kcal`}
                      {e.protein != null && ` · P ${e.protein}g`}
                      {e.carbs != null && ` · C ${e.carbs}g`}
                      {e.fat != null && ` · F ${e.fat}g`}
                    </p>
                  </div>
                  <button
                    onClick={() => onDelete(e.id)}
                    className="p-1 rounded text-slate-300 hover:text-red-500 hover:bg-red-50 transition-colors flex-shrink-0"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
          {/* Subtotal row */}
          {entries.length > 0 && (
            <div className="px-4 py-2 bg-slate-50 text-xs text-slate-500 flex gap-4">
              <span>{Math.round(subtotals.calories)} kcal</span>
              <span>P: {Math.round(subtotals.protein)}g</span>
              <span>C: {Math.round(subtotals.carbs)}g</span>
              <span>F: {Math.round(subtotals.fat)}g</span>
            </div>
          )}
          <div className="px-4 py-2">
            <button
              onClick={() => onAdd(meal.value)}
              className="text-sm text-brand-600 hover:text-brand-700 font-medium flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" /> Add food
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function DietPage() {
  const [selectedDate, setSelectedDate] = useState(formatDate(new Date()));
  const [dayEntries, setDayEntries] = useState<DietEntry[]>([]);
  const [weekEntries, setWeekEntries] = useState<DietEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<FoodForm>(
    defaultForm(selectedDate, "breakfast")
  );

  // ── Fetch ──────────────────────────────────────────────────────────────────

  const fetchDay = useCallback(async (date: string) => {
    setLoading(true);
    setError(null);
    try {
      const [dayRes, weekRes] = await Promise.all([
        fetch(`/api/diet?date=${date}`),
        fetch(
          `/api/diet?from=${formatDate(
            new Date(Date.now() - 6 * 86400000)
          )}&to=${formatDate(new Date())}`
        ),
      ]);
      if (!dayRes.ok) throw new Error("Failed to load diet entries");
      const dayData = await dayRes.json();
      setDayEntries(dayData.data ?? dayData ?? []);
      if (weekRes.ok) {
        const weekData = await weekRes.json();
        setWeekEntries(weekData.data ?? weekData ?? []);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDay(selectedDate);
  }, [selectedDate, fetchDay]);

  // ── Handlers ───────────────────────────────────────────────────────────────

  function openAdd(meal: MealType) {
    setForm(defaultForm(selectedDate, meal));
    setModalOpen(true);
  }

  function setField<K extends keyof FoodForm>(key: K, value: FoodForm[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSave() {
    if (!form.foodName) return;
    setSaving(true);
    try {
      const body = {
        date: form.date,
        mealType: form.mealType,
        foodName: form.foodName,
        calories: form.calories ? parseInt(form.calories, 10) : null,
        protein: form.protein ? parseFloat(form.protein) : null,
        carbs: form.carbs ? parseFloat(form.carbs) : null,
        fat: form.fat ? parseFloat(form.fat) : null,
        fiber: form.fiber ? parseFloat(form.fiber) : null,
        notes: form.notes || null,
      };
      const res = await fetch("/api/diet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("Failed to save entry");
      setModalOpen(false);
      await fetchDay(selectedDate);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    try {
      const res = await fetch(`/api/diet/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
      setDayEntries((prev) => prev.filter((e) => e.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
    }
  }

  // ── Derived data ───────────────────────────────────────────────────────────

  const daily = summarise(dayEntries);
  const weekCals = buildWeekCalories(weekEntries);

  const macroPieData = [
    { name: "Protein", value: Math.round(daily.protein * 4), fill: MACRO_COLORS.protein },
    { name: "Carbs", value: Math.round(daily.carbs * 4), fill: MACRO_COLORS.carbs },
    { name: "Fat", value: Math.round(daily.fat * 9), fill: MACRO_COLORS.fat },
  ].filter((d) => d.value > 0);

  const isToday = selectedDate === formatDate(new Date());
  const isFuture = selectedDate > formatDate(new Date());

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="p-5 md:p-8 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-slate-900">Diet Tracker</h1>
        <p className="text-slate-500 text-sm mt-0.5">
          Log your meals and track nutrition
        </p>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Date picker row */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => setSelectedDate(prevDay(selectedDate))}
          className="p-2 rounded-lg border border-slate-200 hover:bg-slate-100 transition-colors"
          aria-label="Previous day"
        >
          <ChevronLeft className="w-4 h-4 text-slate-600" />
        </button>
        <input
          type="date"
          value={selectedDate}
          max={formatDate(new Date())}
          onChange={(e) => setSelectedDate(e.target.value)}
          className="input w-40"
        />
        <button
          onClick={() => !isFuture && setSelectedDate(nextDay(selectedDate))}
          disabled={isToday}
          className="p-2 rounded-lg border border-slate-200 hover:bg-slate-100 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          aria-label="Next day"
        >
          <ChevronRight className="w-4 h-4 text-slate-600" />
        </button>
        {!isToday && (
          <button
            onClick={() => setSelectedDate(formatDate(new Date()))}
            className="text-sm text-brand-600 hover:text-brand-700 font-medium"
          >
            Today
          </button>
        )}
      </div>

      {/* Daily summary */}
      {loading ? (
        <div className="card p-5 space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonLine key={i} className="h-4" />
          ))}
        </div>
      ) : (
        <div className="card p-5 space-y-3">
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-slate-800">Daily Summary</h2>
            <span className="text-sm font-bold text-slate-900">
              {Math.round(daily.calories)}{" "}
              <span className="font-normal text-slate-500">/ {TARGETS.calories} kcal</span>
            </span>
          </div>
          <ProgressBar
            label="Calories"
            value={daily.calories}
            target={TARGETS.calories}
            color="#14b8a6"
            unit=" kcal"
          />
          <ProgressBar
            label="Protein"
            value={daily.protein}
            target={TARGETS.protein}
            color={MACRO_COLORS.protein}
            unit="g"
          />
          <ProgressBar
            label="Carbohydrates"
            value={daily.carbs}
            target={TARGETS.carbs}
            color={MACRO_COLORS.carbs}
            unit="g"
          />
          <ProgressBar
            label="Fat"
            value={daily.fat}
            target={TARGETS.fat}
            color={MACRO_COLORS.fat}
            unit="g"
          />
        </div>
      )}

      {/* Two column: meals + macro chart */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Meals (2/3 width) */}
        <div className="lg:col-span-2 space-y-3">
          {loading
            ? Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="card p-4 animate-pulse h-24" />
              ))
            : MEAL_TYPES.map((meal) => (
                <MealSection
                  key={meal.value}
                  meal={meal}
                  entries={dayEntries.filter((e) => e.mealType === meal.value)}
                  onAdd={openAdd}
                  onDelete={handleDelete}
                />
              ))}
        </div>

        {/* Macro chart (1/3 width) */}
        <div className="space-y-4">
          <div className="card p-4">
            <h3 className="text-slate-700 mb-3 text-sm font-semibold">
              Macro Breakdown
            </h3>
            {loading ? (
              <SkeletonChart height="h-48" />
            ) : macroPieData.length === 0 ? (
              <div className="h-48 flex items-center justify-center text-slate-400 text-sm">
                <Utensils className="w-8 h-8 opacity-30" />
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={macroPieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={75}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {macroPieData.map((entry, index) => (
                      <Cell key={index} fill={entry.fill} />
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
                    formatter={(value: number) => [`${value} kcal`]}
                  />
                  <Legend
                    iconType="circle"
                    wrapperStyle={{ fontSize: 12 }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* Weekly calories chart */}
      <div className="card p-5">
        <h2 className="text-slate-800 mb-4">Last 7 Days — Calories</h2>
        {loading ? (
          <SkeletonChart height="h-48" />
        ) : (
          <WeeklyCaloriesChart data={weekCals} target={TARGETS.calories} />
        )}
      </div>

      {/* Add Food Modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Add Food"
        maxWidth="md"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Date</label>
              <input
                type="date"
                value={form.date}
                onChange={(e) => setField("date", e.target.value)}
                className="input"
              />
            </div>
            <div>
              <label className="label">Meal</label>
              <select
                value={form.mealType}
                onChange={(e) => setField("mealType", e.target.value as MealType)}
                className="input"
              >
                {MEAL_TYPES.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="label">Food Name *</label>
            <input
              type="text"
              placeholder="e.g. Chicken breast"
              value={form.foodName}
              onChange={(e) => setField("foodName", e.target.value)}
              className="input"
              autoFocus
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Calories (kcal)</label>
              <input
                type="number"
                min="0"
                placeholder="e.g. 350"
                value={form.calories}
                onChange={(e) => setField("calories", e.target.value)}
                className="input"
              />
            </div>
            <div>
              <label className="label">Protein (g)</label>
              <input
                type="number"
                min="0"
                step="0.1"
                placeholder="e.g. 30"
                value={form.protein}
                onChange={(e) => setField("protein", e.target.value)}
                className="input"
              />
            </div>
            <div>
              <label className="label">Carbs (g)</label>
              <input
                type="number"
                min="0"
                step="0.1"
                placeholder="e.g. 40"
                value={form.carbs}
                onChange={(e) => setField("carbs", e.target.value)}
                className="input"
              />
            </div>
            <div>
              <label className="label">Fat (g)</label>
              <input
                type="number"
                min="0"
                step="0.1"
                placeholder="e.g. 12"
                value={form.fat}
                onChange={(e) => setField("fat", e.target.value)}
                className="input"
              />
            </div>
            <div>
              <label className="label">Fiber (g)</label>
              <input
                type="number"
                min="0"
                step="0.1"
                placeholder="e.g. 5"
                value={form.fiber}
                onChange={(e) => setField("fiber", e.target.value)}
                className="input"
              />
            </div>
          </div>

          <div>
            <label className="label">Notes</label>
            <textarea
              rows={2}
              placeholder="Brand, portion size, etc."
              value={form.notes}
              onChange={(e) => setField("notes", e.target.value)}
              className="input resize-none"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              onClick={() => setModalOpen(false)}
              className="btn-secondary"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving || !form.foodName}
              className="btn-primary"
            >
              {saving ? "Saving..." : "Add Food"}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
