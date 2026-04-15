"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus, Dumbbell, Filter } from "lucide-react";
import Modal from "@/components/ui/Modal";
import TrainingSessionCard from "@/components/TrainingSessionCard";
import ActivityDetailModal from "@/components/ActivityDetailModal";
import { SkeletonCard } from "@/components/ui/LoadingSkeleton";
import type { TrainingSession, TrainingType } from "@/types";

// ── Constants ─────────────────────────────────────────────────────────────────

const ACTIVITY_TYPES: { value: TrainingType | "all"; label: string }[] = [
  { value: "all", label: "All Types" },
  { value: "run", label: "Run" },
  { value: "bike", label: "Ride" },
  { value: "swim", label: "Swim" },
  { value: "strength", label: "Strength" },
  { value: "yoga", label: "Yoga" },
  { value: "other", label: "Other" },
];

const EFFORT_LABELS: Record<number, string> = {
  1: "Very Easy",
  2: "Easy",
  3: "Moderate",
  4: "Somewhat Hard",
  5: "Hard",
  6: "Hard+",
  7: "Very Hard",
  8: "Very Hard+",
  9: "Near Max",
  10: "Max Effort",
};

interface SessionForm {
  date: string;
  type: TrainingType;
  distance: string;
  duration: string;
  heartRateAvg: string;
  heartRateMax: string;
  elevationGain: string;
  calories: string;
  perceivedEffort: number;
  notes: string;
}

const defaultForm = (): SessionForm => ({
  date: new Date().toISOString().slice(0, 10),
  type: "run",
  distance: "",
  duration: "",
  heartRateAvg: "",
  heartRateMax: "",
  elevationGain: "",
  calories: "",
  perceivedEffort: 5,
  notes: "",
});

// ── Component ─────────────────────────────────────────────────────────────────

export default function TrainingPage() {
  const [sessions, setSessions] = useState<TrainingSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Filters
  const [filterFrom, setFilterFrom] = useState("");
  const [filterTo, setFilterTo] = useState("");
  const [filterType, setFilterType] = useState<TrainingType | "all">("all");

  // Detail modal
  const [selectedSession, setSelectedSession] = useState<TrainingSession | null>(null);

  // Log / edit modal
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<SessionForm>(defaultForm());

  // ── Data fetching ────────────────────────────────────────────────────────────

  const fetchSessions = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (filterFrom) params.set("from", filterFrom);
      if (filterTo) params.set("to", filterTo);
      const res = await fetch(`/api/training?${params}`);
      if (!res.ok) throw new Error("Failed to load sessions");
      const data = await res.json();
      let list: TrainingSession[] = data.data ?? data ?? [];
      if (filterType !== "all") {
        list = list.filter((s) => s.type === filterType);
      }
      setSessions(list);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [filterFrom, filterTo, filterType]);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  // ── Form handlers ────────────────────────────────────────────────────────────

  function openCreate() {
    setEditingId(null);
    setForm(defaultForm());
    setModalOpen(true);
  }

  function openEdit(session: TrainingSession) {
    setEditingId(session.id);
    setForm({
      date: new Date(session.date).toISOString().slice(0, 10),
      type: session.type as TrainingType,
      distance: session.distance?.toString() ?? "",
      duration: session.duration.toString(),
      heartRateAvg: session.heartRateAvg?.toString() ?? "",
      heartRateMax: session.heartRateMax?.toString() ?? "",
      elevationGain: session.elevationGain?.toString() ?? "",
      calories: session.calories?.toString() ?? "",
      perceivedEffort: session.perceivedEffort,
      notes: session.notes ?? "",
    });
    setModalOpen(true);
  }

  function setField<K extends keyof SessionForm>(key: K, value: SessionForm[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSave() {
    if (!form.duration) return;
    setSaving(true);
    try {
      const body = {
        date: form.date,
        type: form.type,
        distance: form.distance ? parseFloat(form.distance) : null,
        duration: parseInt(form.duration, 10),
        heartRateAvg: form.heartRateAvg ? parseInt(form.heartRateAvg, 10) : null,
        heartRateMax: form.heartRateMax ? parseInt(form.heartRateMax, 10) : null,
        elevationGain: form.elevationGain ? parseFloat(form.elevationGain) : null,
        calories: form.calories ? parseInt(form.calories, 10) : null,
        perceivedEffort: form.perceivedEffort,
        notes: form.notes || null,
      };

      const res = editingId
        ? await fetch(`/api/training/${editingId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          })
        : await fetch("/api/training", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          });

      if (!res.ok) throw new Error("Failed to save session");
      setModalOpen(false);
      await fetchSessions();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this session?")) return;
    try {
      const res = await fetch(`/api/training/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
      setSessions((prev) => prev.filter((s) => s.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
    }
  }

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="p-5 md:p-8 max-w-5xl mx-auto space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-slate-900">Training Log</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            Track your workouts and progress
          </p>
        </div>
        <button onClick={openCreate} className="btn-primary">
          <Plus className="w-4 h-4" />
          Log Session
        </button>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Filter bar */}
      <div className="card p-4 flex flex-wrap gap-3 items-end">
        <Filter className="w-4 h-4 text-slate-400 self-center flex-shrink-0" />
        <div>
          <label className="label">From</label>
          <input
            type="date"
            value={filterFrom}
            onChange={(e) => setFilterFrom(e.target.value)}
            className="input w-36"
          />
        </div>
        <div>
          <label className="label">To</label>
          <input
            type="date"
            value={filterTo}
            onChange={(e) => setFilterTo(e.target.value)}
            className="input w-36"
          />
        </div>
        <div>
          <label className="label">Type</label>
          <select
            value={filterType}
            onChange={(e) =>
              setFilterType(e.target.value as TrainingType | "all")
            }
            className="input w-36"
          >
            {ACTIVITY_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>
        {(filterFrom || filterTo || filterType !== "all") && (
          <button
            onClick={() => {
              setFilterFrom("");
              setFilterTo("");
              setFilterType("all");
            }}
            className="btn-secondary self-end"
          >
            Clear
          </button>
        )}
      </div>

      {/* Sessions list */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : sessions.length === 0 ? (
        <div className="card p-12 text-center">
          <Dumbbell className="w-12 h-12 mx-auto mb-3 text-slate-200" />
          <h3 className="text-slate-600 mb-1">No sessions found</h3>
          <p className="text-slate-400 text-sm mb-4">
            {filterFrom || filterTo || filterType !== "all"
              ? "Try adjusting your filters"
              : "Log your first training session to get started"}
          </p>
          <button onClick={openCreate} className="btn-primary mx-auto">
            <Plus className="w-4 h-4" />
            Log Session
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {sessions.map((session) => (
            <TrainingSessionCard
              key={session.id}
              session={session}
              onEdit={(s) => { openEdit(s); }}
              onDelete={handleDelete}
              onClick={() => setSelectedSession(session)}
            />
          ))}
        </div>
      )}

      {/* Activity Detail Modal */}
      {selectedSession && (
        <ActivityDetailModal
          sessionId={selectedSession.id}
          stravaId={selectedSession.stravaId ?? null}
          session={selectedSession}
          onClose={() => setSelectedSession(null)}
        />
      )}

      {/* Log / Edit Modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingId ? "Edit Session" : "Log Session"}
        maxWidth="lg"
      >
        <div className="space-y-4">
          {/* Row 1: Date + Type */}
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
              <label className="label">Type</label>
              <select
                value={form.type}
                onChange={(e) => setField("type", e.target.value as TrainingType)}
                className="input"
              >
                {ACTIVITY_TYPES.filter((t) => t.value !== "all").map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Row 2: Distance + Duration */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Distance (km)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                placeholder="e.g. 10.5"
                value={form.distance}
                onChange={(e) => setField("distance", e.target.value)}
                className="input"
              />
            </div>
            <div>
              <label className="label">Duration (minutes) *</label>
              <input
                type="number"
                min="1"
                placeholder="e.g. 45"
                value={form.duration}
                onChange={(e) => setField("duration", e.target.value)}
                className="input"
                required
              />
            </div>
          </div>

          {/* Row 3: HR */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Avg Heart Rate (bpm)</label>
              <input
                type="number"
                min="0"
                placeholder="e.g. 155"
                value={form.heartRateAvg}
                onChange={(e) => setField("heartRateAvg", e.target.value)}
                className="input"
              />
            </div>
            <div>
              <label className="label">Max Heart Rate (bpm)</label>
              <input
                type="number"
                min="0"
                placeholder="e.g. 178"
                value={form.heartRateMax}
                onChange={(e) => setField("heartRateMax", e.target.value)}
                className="input"
              />
            </div>
          </div>

          {/* Row 4: Elevation + Calories */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Elevation Gain (m)</label>
              <input
                type="number"
                min="0"
                placeholder="e.g. 250"
                value={form.elevationGain}
                onChange={(e) => setField("elevationGain", e.target.value)}
                className="input"
              />
            </div>
            <div>
              <label className="label">Calories Burned</label>
              <input
                type="number"
                min="0"
                placeholder="e.g. 520"
                value={form.calories}
                onChange={(e) => setField("calories", e.target.value)}
                className="input"
              />
            </div>
          </div>

          {/* Perceived Effort */}
          <div>
            <label className="label">
              Perceived Effort — {form.perceivedEffort}/10{" "}
              <span className="font-normal text-slate-500">
                ({EFFORT_LABELS[form.perceivedEffort]})
              </span>
            </label>
            <input
              type="range"
              min="1"
              max="10"
              value={form.perceivedEffort}
              onChange={(e) =>
                setField("perceivedEffort", parseInt(e.target.value, 10))
              }
              className="w-full accent-brand-500"
            />
            <div className="flex justify-between text-xs text-slate-400 mt-1">
              <span>Very Easy</span>
              <span>Max Effort</span>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="label">Notes</label>
            <textarea
              rows={3}
              placeholder="How did it feel? Any highlights or issues..."
              value={form.notes}
              onChange={(e) => setField("notes", e.target.value)}
              className="input resize-none"
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2">
            <button
              onClick={() => setModalOpen(false)}
              className="btn-secondary"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving || !form.duration}
              className="btn-primary"
            >
              {saving ? "Saving..." : editingId ? "Update Session" : "Log Session"}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
