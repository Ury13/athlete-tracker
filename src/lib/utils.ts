// ─── Formatting ──────────────────────────────────────────────────────────────

export function formatPace(paceMinPerKm: number): string {
  const minutes = Math.floor(paceMinPerKm);
  const seconds = Math.round((paceMinPerKm - minutes) * 60);
  return `${minutes}:${seconds.toString().padStart(2, "0")}/km`;
}

export function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  return `${h}h ${m}m`;
}

export function formatDistance(km: number): string {
  return `${km.toFixed(1)} km`;
}

// ─── Date helpers ─────────────────────────────────────────────────────────────

/** Returns the Monday of the week containing `date`. */
export function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay(); // 0=Sun … 6=Sat
  const diff = day === 0 ? -6 : 1 - day; // shift to Monday
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

/** Returns `{ from, to }` spanning the last `days` days ending now. */
export function getDateRange(days: number): { from: Date; to: Date } {
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - days);
  from.setHours(0, 0, 0, 0);
  return { from, to };
}

// ─── Statistics ───────────────────────────────────────────────────────────────

/**
 * Calculates the Exponential Moving Average for a series of values.
 * Uses the standard smoothing factor: α = 2 / (period + 1).
 * The first EMA value is seeded with the first element of the array.
 */
export function calcEMA(values: number[], period: number): number[] {
  if (values.length === 0) return [];
  const alpha = 2 / (period + 1);
  const result: number[] = [values[0]];
  for (let i = 1; i < values.length; i++) {
    result.push(alpha * values[i] + (1 - alpha) * result[i - 1]);
  }
  return result;
}

// ─── Greeting ─────────────────────────────────────────────────────────────────

export function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

// ─── Class names ──────────────────────────────────────────────────────────────

export function cn(...classes: (string | undefined | false)[]): string {
  return classes.filter(Boolean).join(" ");
}
