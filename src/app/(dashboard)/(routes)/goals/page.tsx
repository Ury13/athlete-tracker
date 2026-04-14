"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Plus,
  Target,
  Trophy,
  Trash2,
  CheckCircle2,
  Calendar,
  ChevronDown,
} from "lucide-react";
import Modal from "@/components/ui/Modal";
import { SkeletonCard } from "@/components/ui/LoadingSkeleton";
import type { Goal, GoalType } from "@/types";

// ── Constants ─────────────────────────────────────────────────────────────────

const GOAL_TYPES: { value: GoalType; label: string; unit: string }[] = [
  { value: "distance", label: "Distance", unit: "km" },
  { value: "race", label: "Race / Event", unit: "event" },
  { value: "weight", label: "Weight", unit: "kg" },
  { value: "pace", label: "Pace", unit: "min/km" },
  { value: "habit", label: "Habit / Streak", unit: "days" },
  { value: "other", label: "Other", unit: "" },
];

const TYPE_BADGE: Record<
  GoalType,
  { label: string; className: string }
> = {
  distance: {
    label: "Distance",
    className: "bg-blue-100 text-blue-700",
  },
  race: {
    label: "Race",
    className: "bg-purple-100 text-purple-700",
  },
  weight: {
    label: "Weight",
    className: "bg-green-100 text-green-700",
  },
  pace: {
    label: "Pace",
    className: "bg-orange-100 text-orange-700",
  },
  habit: {
    label: "Habit",
    className: "bg-pink-100 text-pink-700",
  },
  other: {
    label: "Other",
    className: "bg-slate-100 text-slate-600",
  },
};

interface GoalForm {
  title: string;
  description: string;
  type: GoalType;
  targetValue: string;
  currentValue: string;
  unit: string;
  deadline: string;
}

const defaultForm = (): GoalForm => ({
  title: "",
  description: "",
  type: "distance",
  targetValue: "",
  currentValue: "",
  unit: "km",
  deadline: "",
});

// ── Helpers ───────────────────────────────────────────────────────────────────

function daysUntil(deadline: Date | null): string | null {
  if (!deadline) return null;
  const diff = Math.ceil(
    (new Date(deadline).getTime() - Date.now()) / 86400000
  );
  if (diff < 0) return "Overdue";
  if (diff === 0) return "Due today";
  if (diff === 1) return "1 day left";
  return `${diff} days left`;
}

function progressPct(goal: Goal): number {
  if (
    goal.targetValue == null ||
    goal.targetValue === 0 ||
    goal.currentValue == null
  )
    return 0;
  return Math.min(100, Math.round((goal.currentValue / goal.targetValue) * 100));
}

// ── Goal Card ─────────────────────────────────────────────────────────────────

function GoalCard({
  goal,
  onDelete,
  onComplete,
  onUpdateProgress,
}: {
  goal: Goal;
  onDelete: (id: string) => void;
  onComplete: (id: string) => void;
  onUpdateProgress: (id: string, value: number) => void;
}) {
  const [progressInput, setProgressInput] = useState("");
  const [showProgress, setShowProgress] = useState(false);
  const pct = progressPct(goal);
  const badge = TYPE_BADGE[goal.type as GoalType] ?? TYPE_BADGE.other;
  const countdown = daysUntil(goal.deadline);

  return (
    <div
      className={`card p-5 flex flex-col gap-3 ${
        goal.completed ? "opacity-75" : ""
      }`}
    >
      {/* Header */}
      <div className="flex items-start gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className={`badge ${badge.className}`}>{badge.label}</span>
            {goal.completed && (
              <span className="badge bg-emerald-100 text-emerald-700">
                Completed
              </span>
            )}
          </div>
          <h3 className="font-semibold text-slate-800 leading-snug">
            {goal.title}
          </h3>
          {goal.description && (
            <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">
              {goal.description}
            </p>
          )}
        </div>
        <div className="flex gap-1 flex-shrink-0">
          {!goal.completed && (
            <button
              onClick={() => onComplete(goal.id)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors"
              title="Mark complete"
            >
              <CheckCircle2 className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={() => onDelete(goal.id)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
            title="Delete goal"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Progress */}
      {goal.targetValue != null && (
        <div>
          <div className="flex justify-between text-xs text-slate-600 mb-1">
            <span>
              {goal.currentValue ?? 0} / {goal.targetValue}{" "}
              {goal.unit && <span className="text-slate-400">{goal.unit}</span>}
            </span>
            <span className="font-medium">{pct}%</span>
          </div>
          <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full bg-brand-500 transition-all duration-500"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      )}

      {/* Deadline */}
      {countdown && (
        <div
          className={`flex items-center gap-1.5 text-xs ${
            countdown === "Overdue"
              ? "text-red-500"
              : countdown === "Due today"
              ? "text-orange-500"
              : "text-slate-500"
          }`}
        >
          <Calendar className="w-3.5 h-3.5" />
          {countdown}
          {goal.deadline && (
            <span className="text-slate-400">
              ·{" "}
              {new Date(goal.deadline).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </span>
          )}
        </div>
      )}

      {/* Update progress */}
      {!goal.completed && goal.targetValue != null && (
        <div>
          <button
            onClick={() => setShowProgress((s) => !s)}
            className="text-sm text-brand-600 hover:text-brand-700 font-medium flex items-center gap-1"
          >
            <Plus className="w-3.5 h-3.5" />
            Update Progress
            <ChevronDown
              className={`w-3.5 h-3.5 transition-transform ${
                showProgress ? "rotate-180" : ""
              }`}
            />
          </button>
          {showProgress && (
            <div className="flex gap-2 mt-2">
              <input
                type="number"
                min="0"
                step="0.1"
                placeholder={`New value (${goal.unit ?? ""})`}
                value={progressInput}
                onChange={(e) => setProgressInput(e.target.value)}
                className="input flex-1 text-sm"
                autoFocus
              />
              <button
                onClick={() => {
                  if (progressInput) {
                    onUpdateProgress(goal.id, parseFloat(progressInput));
                    setProgressInput("");
                    setShowProgress(false);
                  }
                }}
                className="btn-primary text-sm py-1.5"
              >
                Save
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

type FilterTab = "all" | "active" | "completed";

export default function GoalsPage() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState<FilterTab>("active");

  // Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<GoalForm>(defaultForm());

  // ── Fetch ──────────────────────────────────────────────────────────────────

  const fetchGoals = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/goals");
      if (!res.ok) throw new Error("Failed to load goals");
      const data = await res.json();
      setGoals(data.data ?? data ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchGoals();
  }, [fetchGoals]);

  // ── Handlers ───────────────────────────────────────────────────────────────

  function setField<K extends keyof GoalForm>(key: K, value: GoalForm[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function handleTypeChange(type: GoalType) {
    const preset = GOAL_TYPES.find((t) => t.value === type);
    setForm((prev) => ({
      ...prev,
      type,
      unit: preset?.unit ?? prev.unit,
    }));
  }

  async function handleSave() {
    if (!form.title) return;
    setSaving(true);
    try {
      const body = {
        title: form.title,
        description: form.description || null,
        type: form.type,
        targetValue: form.targetValue ? parseFloat(form.targetValue) : null,
        currentValue: form.currentValue ? parseFloat(form.currentValue) : null,
        unit: form.unit || null,
        deadline: form.deadline || null,
      };
      const res = await fetch("/api/goals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("Failed to create goal");
      setModalOpen(false);
      setForm(defaultForm());
      await fetchGoals();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this goal?")) return;
    try {
      const res = await fetch(`/api/goals/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
      setGoals((prev) => prev.filter((g) => g.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
    }
  }

  async function handleComplete(id: string) {
    try {
      const res = await fetch(`/api/goals/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completed: true }),
      });
      if (!res.ok) throw new Error("Update failed");
      setGoals((prev) =>
        prev.map((g) => (g.id === id ? { ...g, completed: true } : g))
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed");
    }
  }

  async function handleUpdateProgress(id: string, value: number) {
    try {
      const res = await fetch(`/api/goals/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentValue: value }),
      });
      if (!res.ok) throw new Error("Update failed");
      setGoals((prev) =>
        prev.map((g) => (g.id === id ? { ...g, currentValue: value } : g))
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed");
    }
  }

  // ── Filtered data ──────────────────────────────────────────────────────────

  const filtered = goals.filter((g) => {
    if (tab === "active") return !g.completed;
    if (tab === "completed") return g.completed;
    return true;
  });

  const TABS: { value: FilterTab; label: string }[] = [
    { value: "all", label: `All (${goals.length})` },
    {
      value: "active",
      label: `Active (${goals.filter((g) => !g.completed).length})`,
    },
    {
      value: "completed",
      label: `Completed (${goals.filter((g) => g.completed).length})`,
    },
  ];

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="p-5 md:p-8 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-slate-900">Goals</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            Set targets and track your progress
          </p>
        </div>
        <button
          onClick={() => {
            setForm(defaultForm());
            setModalOpen(true);
          }}
          className="btn-primary"
        >
          <Plus className="w-4 h-4" />
          New Goal
        </button>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Filter tabs */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit">
        {TABS.map((t) => (
          <button
            key={t.value}
            onClick={() => setTab(t.value)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              tab === t.value
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Goals grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="card p-12 text-center">
          {tab === "completed" ? (
            <>
              <Trophy className="w-12 h-12 mx-auto mb-3 text-slate-200" />
              <h3 className="text-slate-600 mb-1">No completed goals yet</h3>
              <p className="text-slate-400 text-sm">Keep working — you&apos;ll get there!</p>
            </>
          ) : (
            <>
              <Target className="w-12 h-12 mx-auto mb-3 text-slate-200" />
              <h3 className="text-slate-600 mb-1">No goals found</h3>
              <p className="text-slate-400 text-sm mb-4">
                Set your first goal to start tracking progress
              </p>
              <button
                onClick={() => {
                  setForm(defaultForm());
                  setModalOpen(true);
                }}
                className="btn-primary mx-auto"
              >
                <Plus className="w-4 h-4" />
                New Goal
              </button>
            </>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((goal) => (
            <GoalCard
              key={goal.id}
              goal={goal}
              onDelete={handleDelete}
              onComplete={handleComplete}
              onUpdateProgress={handleUpdateProgress}
            />
          ))}
        </div>
      )}

      {/* New Goal Modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="New Goal"
        maxWidth="lg"
      >
        <div className="space-y-4">
          <div>
            <label className="label">Title *</label>
            <input
              type="text"
              placeholder="e.g. Run a half marathon"
              value={form.title}
              onChange={(e) => setField("title", e.target.value)}
              className="input"
              autoFocus
            />
          </div>

          <div>
            <label className="label">Description</label>
            <textarea
              rows={2}
              placeholder="Optional notes about this goal..."
              value={form.description}
              onChange={(e) => setField("description", e.target.value)}
              className="input resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Goal Type</label>
              <select
                value={form.type}
                onChange={(e) =>
                  handleTypeChange(e.target.value as GoalType)
                }
                className="input"
              >
                {GOAL_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Unit</label>
              <input
                type="text"
                placeholder="e.g. km, kg, min/km"
                value={form.unit}
                onChange={(e) => setField("unit", e.target.value)}
                className="input"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Target Value</label>
              <input
                type="number"
                min="0"
                step="0.01"
                placeholder="e.g. 21.1"
                value={form.targetValue}
                onChange={(e) => setField("targetValue", e.target.value)}
                className="input"
              />
            </div>
            <div>
              <label className="label">Current Value</label>
              <input
                type="number"
                min="0"
                step="0.01"
                placeholder="e.g. 0"
                value={form.currentValue}
                onChange={(e) => setField("currentValue", e.target.value)}
                className="input"
              />
            </div>
          </div>

          <div>
            <label className="label">Deadline</label>
            <input
              type="date"
              value={form.deadline}
              min={new Date().toISOString().slice(0, 10)}
              onChange={(e) => setField("deadline", e.target.value)}
              className="input"
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
              disabled={saving || !form.title}
              className="btn-primary"
            >
              {saving ? "Saving..." : "Create Goal"}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
