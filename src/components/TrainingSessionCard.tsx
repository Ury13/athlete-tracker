"use client";

import { Pencil, Trash2, Bike, Dumbbell, PersonStanding, Waves } from "lucide-react";
import type { TrainingSession, TrainingType } from "@/types";

// ── Helpers ─────────────────────────────────────────────────────────────────

function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h > 0 ? `${h}h ${m.toString().padStart(2, "0")}m` : `${m}m`;
}

function formatPace(pace: number): string {
  const mins = Math.floor(pace);
  const secs = Math.round((pace - mins) * 60);
  return `${mins}:${secs.toString().padStart(2, "0")} /km`;
}

const typeConfig: Record<
  TrainingType,
  { label: string; color: string; bg: string; icon: React.ElementType }
> = {
  run: {
    label: "Run",
    color: "text-blue-600",
    bg: "bg-blue-50",
    icon: ({ className }: { className?: string }) => (
      <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
  },
  bike: { label: "Ride", color: "text-green-600", bg: "bg-green-50", icon: Bike },
  swim: { label: "Swim", color: "text-cyan-600", bg: "bg-cyan-50", icon: Waves },
  strength: { label: "Strength", color: "text-orange-600", bg: "bg-orange-50", icon: Dumbbell },
  yoga: {
    label: "Yoga",
    color: "text-purple-600",
    bg: "bg-purple-50",
    icon: PersonStanding,
  },
  other: {
    label: "Other",
    color: "text-slate-600",
    bg: "bg-slate-100",
    icon: ({ className }: { className?: string }) => (
      <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <circle cx="12" cy="12" r="9" />
      </svg>
    ),
  },
};

const effortEmoji = (e: number) => {
  if (e <= 2) return "Easy";
  if (e <= 4) return "Moderate";
  if (e <= 6) return "Hard";
  if (e <= 8) return "Very Hard";
  return "Max";
};

interface TrainingSessionCardProps {
  session: TrainingSession;
  onEdit?: (session: TrainingSession) => void;
  onDelete?: (id: string) => void;
  onClick?: () => void;
}

export default function TrainingSessionCard({
  session,
  onEdit,
  onDelete,
  onClick,
}: TrainingSessionCardProps) {
  const cfg = typeConfig[session.type as TrainingType] ?? typeConfig.other;
  const Icon = cfg.icon;

  return (
    <div
      className={`card p-4 flex flex-col gap-3${onClick ? " cursor-pointer hover:shadow-md transition-shadow" : ""}`}
      onClick={onClick}
    >
      {/* Top row */}
      <div className="flex items-start gap-3">
        <div
          className={`flex-shrink-0 w-10 h-10 rounded-xl ${cfg.bg} flex items-center justify-center`}
        >
          <Icon className={`w-5 h-5 ${cfg.color}`} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`font-semibold text-sm ${cfg.color}`}>
              {cfg.label}
            </span>
            <span className="text-slate-400 text-xs">
              {new Date(session.date).toLocaleDateString("en-US", {
                weekday: "short",
                month: "short",
                day: "numeric",
              })}
            </span>
          </div>
          <p className="text-slate-500 text-xs mt-0.5">
            {formatDuration(session.duration)}
          </p>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          {onEdit && (
            <button
              onClick={(e) => { e.stopPropagation(); onEdit(session); }}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              aria-label="Edit session"
            >
              <Pencil className="w-4 h-4" />
            </button>
          )}
          {onDelete && (
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(session.id); }}
              className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
              aria-label="Delete session"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Stats row */}
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600">
        {session.distance != null && (
          <span>
            <span className="font-semibold text-slate-800">
              {session.distance.toFixed(2)}
            </span>{" "}
            km
          </span>
        )}
        {session.pace != null && (
          <span>
            <span className="font-semibold text-slate-800">
              {formatPace(session.pace)}
            </span>{" "}
            pace
          </span>
        )}
        {session.heartRateAvg != null && (
          <span>
            <span className="font-semibold text-slate-800">
              {session.heartRateAvg}
            </span>{" "}
            bpm avg
          </span>
        )}
        {session.elevationGain != null && session.elevationGain > 0 && (
          <span>
            <span className="font-semibold text-slate-800">
              {Math.round(session.elevationGain)}
            </span>{" "}
            m elev
          </span>
        )}
        {session.calories != null && (
          <span>
            <span className="font-semibold text-slate-800">
              {session.calories}
            </span>{" "}
            kcal
          </span>
        )}
      </div>

      {/* Effort */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-slate-500">Effort</span>
        <div className="flex gap-0.5">
          {Array.from({ length: 10 }, (_, i) => (
            <span
              key={i}
              className={`w-2 h-2 rounded-full ${
                i < session.perceivedEffort
                  ? session.perceivedEffort <= 3
                    ? "bg-emerald-400"
                    : session.perceivedEffort <= 6
                    ? "bg-yellow-400"
                    : session.perceivedEffort <= 8
                    ? "bg-orange-400"
                    : "bg-red-500"
                  : "bg-slate-200"
              }`}
            />
          ))}
        </div>
        <span className="text-xs text-slate-500">
          {session.perceivedEffort}/10 — {effortEmoji(session.perceivedEffort)}
        </span>
      </div>

      {/* Notes */}
      {session.notes && (
        <p className="text-xs text-slate-500 italic truncate">{session.notes}</p>
      )}

      {/* View details link */}
      {onClick && (
        <div className="flex justify-end">
          <span className="text-xs text-brand-600 font-medium hover:underline">
            View details →
          </span>
        </div>
      )}
    </div>
  );
}
