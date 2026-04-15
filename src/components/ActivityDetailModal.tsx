"use client";

import { useEffect, useState } from "react";
import Modal from "@/components/ui/Modal";
import ActivityMap from "@/components/ActivityMap";
import type { TrainingSession, TrainingType } from "@/types";

// ── Types ─────────────────────────────────────────────────────────────────────

interface StravaActivity {
  name?: string;
  sport_type?: string;
  type?: string;
  map?: { polyline?: string; summary_polyline?: string };
  start_latlng?: [number, number];
  end_latlng?: [number, number];
  average_cadence?: number;
  average_watts?: number;
  elapsed_time?: number;
  moving_time?: number;
  splits_metric?: StravaSplit[];
}

interface StravaSplit {
  split: number;
  distance: number; // metres
  elapsed_time: number; // seconds
  moving_time: number; // seconds
  average_heartrate?: number;
  elevation_difference?: number;
}

interface Props {
  sessionId: string;
  stravaId: string | null;
  session: TrainingSession;
  onClose: () => void;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h > 0 ? `${h}h ${m.toString().padStart(2, "0")}m` : `${m}m`;
}

function formatSeconds(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}h ${m.toString().padStart(2, "0")}m`;
  return `${m}m ${s.toString().padStart(2, "0")}s`;
}

function formatPace(pace: number): string {
  const mins = Math.floor(pace);
  const secs = Math.round((pace - mins) * 60);
  return `${mins}:${secs.toString().padStart(2, "0")} /km`;
}

function splitPace(split: StravaSplit): string {
  const distKm = split.distance / 1000;
  if (distKm === 0 || split.moving_time === 0) return "—";
  const paceMinPerKm = split.moving_time / 60 / distKm;
  return formatPace(paceMinPerKm);
}

const TYPE_LABELS: Record<TrainingType, string> = {
  run: "Run",
  bike: "Ride",
  swim: "Swim",
  strength: "Strength",
  yoga: "Yoga",
  other: "Other",
};

const TYPE_COLORS: Record<TrainingType, string> = {
  run: "bg-blue-100 text-blue-700",
  bike: "bg-green-100 text-green-700",
  swim: "bg-cyan-100 text-cyan-700",
  strength: "bg-orange-100 text-orange-700",
  yoga: "bg-purple-100 text-purple-700",
  other: "bg-slate-100 text-slate-600",
};

// ── Stat cell ─────────────────────────────────────────────────────────────────

function StatCell({
  label,
  value,
}: {
  label: string;
  value: string | number | null | undefined;
}) {
  if (value == null) return null;
  return (
    <div className="bg-slate-50 rounded-xl p-3">
      <p className="text-xs text-slate-500 mb-0.5">{label}</p>
      <p className="font-semibold text-slate-900 text-sm">{value}</p>
    </div>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function ActivityDetailModal({
  stravaId,
  session,
  onClose,
}: Props) {
  const [stravaData, setStravaData] = useState<StravaActivity | null>(null);
  const [loadingStrava, setLoadingStrava] = useState(false);
  const [stravaError, setStravaError] = useState<string | null>(null);

  useEffect(() => {
    if (!stravaId) return;
    setLoadingStrava(true);
    setStravaError(null);

    fetch(`/api/strava/activity/${stravaId}`)
      .then(async (res) => {
        const json = await res.json();
        if (json.error === "token_expired") {
          setStravaError("token_expired");
        } else if (json.error) {
          setStravaError(json.error);
        } else {
          setStravaData(json.data);
        }
      })
      .catch(() => setStravaError("fetch_failed"))
      .finally(() => setLoadingStrava(false));
  }, [stravaId]);

  const typeKey = (session.type as TrainingType) in TYPE_LABELS
    ? (session.type as TrainingType)
    : "other";

  const activityName =
    stravaData?.name ??
    session.name ??
    `${TYPE_LABELS[typeKey]} — ${new Date(session.date).toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    })}`;

  const polyline =
    stravaData?.map?.polyline ?? stravaData?.map?.summary_polyline ?? null;

  const isRun = typeKey === "run";

  return (
    <Modal open onClose={onClose} title="Activity Detail" maxWidth="2xl">
      <div className="space-y-5">
        {/* Activity header */}
        <div className="flex items-start gap-3">
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-semibold text-slate-900 leading-snug">
              {activityName}
            </h3>
            <p className="text-sm text-slate-500 mt-0.5">
              {new Date(session.date).toLocaleDateString("en-US", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </p>
          </div>
          <span
            className={`flex-shrink-0 text-xs font-medium px-2.5 py-1 rounded-full ${TYPE_COLORS[typeKey]}`}
          >
            {TYPE_LABELS[typeKey]}
          </span>
        </div>

        {/* Map section */}
        {stravaId && (
          <div className="rounded-xl overflow-hidden border border-slate-200">
            {loadingStrava ? (
              <div className="h-[300px] bg-slate-100 animate-pulse" />
            ) : stravaError === "token_expired" ? (
              <div className="h-[120px] flex items-center justify-center bg-amber-50 border border-amber-200 rounded-xl px-4 text-sm text-amber-700 text-center">
                Strava token expired — log out and back in to view maps
              </div>
            ) : polyline ? (
              <ActivityMap
                polyline={polyline}
                startLatlng={stravaData?.start_latlng ?? undefined}
                endLatlng={stravaData?.end_latlng ?? undefined}
              />
            ) : !loadingStrava && stravaData ? (
              <div className="h-[80px] flex items-center justify-center bg-slate-50 rounded-xl text-sm text-slate-400">
                No route data available for this activity
              </div>
            ) : null}
          </div>
        )}

        {/* Primary stats grid */}
        <div>
          <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
            Stats
          </h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <StatCell
              label="Distance"
              value={
                session.distance != null
                  ? `${session.distance.toFixed(2)} km`
                  : null
              }
            />
            <StatCell
              label="Duration"
              value={formatDuration(session.duration)}
            />
            {isRun && session.pace != null && (
              <StatCell label="Pace" value={formatPace(session.pace)} />
            )}
            <StatCell
              label="Elevation"
              value={
                session.elevationGain != null
                  ? `${Math.round(session.elevationGain)} m`
                  : null
              }
            />
            <StatCell
              label="Avg HR"
              value={
                session.heartRateAvg != null
                  ? `${session.heartRateAvg} bpm`
                  : null
              }
            />
            <StatCell
              label="Max HR"
              value={
                session.heartRateMax != null
                  ? `${session.heartRateMax} bpm`
                  : null
              }
            />
            <StatCell
              label="Calories"
              value={
                session.calories != null ? `${session.calories} kcal` : null
              }
            />
            <StatCell
              label="Perceived Effort"
              value={`${session.perceivedEffort}/10`}
            />
          </div>
        </div>

        {/* Extra Strava stats */}
        {stravaData && (
          <div>
            <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
              Strava Details
            </h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {(stravaData.average_cadence ?? 0) > 0 && (
                <StatCell
                  label="Avg Cadence"
                  value={`${Math.round(stravaData.average_cadence!)} rpm`}
                />
              )}
              {stravaData.average_watts != null && (
                <StatCell
                  label="Avg Power"
                  value={`${Math.round(stravaData.average_watts)} W`}
                />
              )}
              {stravaData.elapsed_time != null && (
                <StatCell
                  label="Elapsed Time"
                  value={formatSeconds(stravaData.elapsed_time)}
                />
              )}
              {stravaData.moving_time != null && (
                <StatCell
                  label="Moving Time"
                  value={formatSeconds(stravaData.moving_time)}
                />
              )}
            </div>
          </div>
        )}

        {/* Splits */}
        {stravaData?.splits_metric && stravaData.splits_metric.length > 0 && (
          <div>
            <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
              Splits
            </h4>
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-slate-500">
                      Split
                    </th>
                    <th className="px-3 py-2 text-right text-xs font-semibold text-slate-500">
                      Distance
                    </th>
                    <th className="px-3 py-2 text-right text-xs font-semibold text-slate-500">
                      Pace
                    </th>
                    <th className="px-3 py-2 text-right text-xs font-semibold text-slate-500">
                      HR
                    </th>
                    <th className="px-3 py-2 text-right text-xs font-semibold text-slate-500">
                      Elev
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {stravaData.splits_metric.map((split) => (
                    <tr
                      key={split.split}
                      className="hover:bg-slate-50 transition-colors"
                    >
                      <td className="px-3 py-2 text-slate-700 font-medium">
                        {split.split}
                      </td>
                      <td className="px-3 py-2 text-right text-slate-600">
                        {(split.distance / 1000).toFixed(2)} km
                      </td>
                      <td className="px-3 py-2 text-right text-slate-600">
                        {splitPace(split)}
                      </td>
                      <td className="px-3 py-2 text-right text-slate-600">
                        {split.average_heartrate != null
                          ? `${Math.round(split.average_heartrate)} bpm`
                          : "—"}
                      </td>
                      <td className="px-3 py-2 text-right text-slate-600">
                        {split.elevation_difference != null
                          ? `${split.elevation_difference > 0 ? "+" : ""}${Math.round(
                              split.elevation_difference
                            )} m`
                          : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Notes */}
        {session.notes && (
          <div>
            <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
              Notes
            </h4>
            <p className="text-sm text-slate-700 bg-slate-50 rounded-xl p-3 leading-relaxed">
              {session.notes}
            </p>
          </div>
        )}
      </div>
    </Modal>
  );
}
