// ─── Core model types ───────────────────────────────────────────────────────

export interface User {
  id: string;
  email: string;
  name: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export type TrainingType =
  | "run"
  | "bike"
  | "swim"
  | "strength"
  | "yoga"
  | "other";

export interface TrainingSession {
  id: string;
  userId: string;
  stravaId?: string | null;
  name?: string | null;
  date: Date;
  type: TrainingType;
  distance: number | null; // km
  duration: number; // minutes
  pace: number | null; // min/km
  heartRateAvg: number | null;
  heartRateMax: number | null;
  elevationGain: number | null; // meters
  calories: number | null;
  perceivedEffort: number; // 1-10
  notes: string | null;
  createdAt: Date;
}

export type MealType = "breakfast" | "lunch" | "dinner" | "snack";

export interface DietEntry {
  id: string;
  userId: string;
  date: Date;
  mealType: MealType;
  foodName: string;
  calories: number | null;
  protein: number | null; // grams
  carbs: number | null; // grams
  fat: number | null; // grams
  fiber: number | null; // grams
  notes: string | null;
  createdAt: Date;
}

export interface BodyMetric {
  id: string;
  userId: string;
  date: Date;
  weight: number | null; // kg
  restingHR: number | null;
  sleepHours: number | null;
  sleepQuality: number | null; // 1-10
  hrv: number | null;
  vo2max: number | null;
  notes: string | null;
  // Garmin-specific fields
  bodyBattery?: number | null;
  bodyBatteryLow?: number | null;
  stressAvg?: number | null;
  steps?: number | null;
  deepSleepMin?: number | null;
  remSleepMin?: number | null;
  sleepScore?: number | null;
  trainingReadiness?: number | null;
  createdAt: Date;
}

export type GoalType =
  | "distance"
  | "race"
  | "weight"
  | "pace"
  | "habit"
  | "other";

export interface Goal {
  id: string;
  userId: string;
  title: string;
  description: string | null;
  type: GoalType;
  targetValue: number | null;
  currentValue: number | null;
  unit: string | null;
  deadline: Date | null;
  completed: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// ─── Aggregated / computed types ─────────────────────────────────────────────

export interface TrainingWeeklySummary {
  totalSessions: number;
  totalDistance: number; // km
  totalDuration: number; // minutes
  totalCalories: number;
  avgPerceivedEffort: number;
  sessionsByType: Record<TrainingType, number>;
}

export interface DietWeeklySummary {
  totalCalories: number;
  avgCaloriesPerDay: number;
  totalProtein: number; // grams
  totalCarbs: number; // grams
  totalFat: number; // grams
  totalFiber: number; // grams
}

export interface MetricsWeeklySummary {
  avgWeight: number | null;
  avgRestingHR: number | null;
  avgSleepHours: number | null;
  avgSleepQuality: number | null;
  avgHrv: number | null;
}

export interface WeeklySummary {
  weekStart: Date;
  weekEnd: Date;
  training: TrainingWeeklySummary;
  diet: DietWeeklySummary;
  metrics: MetricsWeeklySummary;
}

// ─── API response wrappers ────────────────────────────────────────────────────

export interface ApiResponse<T> {
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}
