import { TrendingDown, TrendingUp } from "lucide-react";

interface StatCardProps {
  label: string;
  value: string | number;
  unit?: string;
  trend?: "up" | "down" | "neutral";
  trendLabel?: string;
  icon?: React.ReactNode;
  highlight?: boolean;
}

export default function StatCard({
  label,
  value,
  unit,
  trend,
  trendLabel,
  icon,
  highlight = false,
}: StatCardProps) {
  return (
    <div
      className={`card p-4 flex flex-col gap-2 ${
        highlight ? "border-brand-200 bg-brand-50/50" : ""
      }`}
    >
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">
          {label}
        </p>
        {icon && (
          <span className="text-slate-400">{icon}</span>
        )}
      </div>
      <div className="flex items-end gap-1">
        <span
          className={`text-2xl font-bold leading-none ${
            highlight ? "text-brand-700" : "text-slate-900"
          }`}
        >
          {value}
        </span>
        {unit && (
          <span className="text-sm font-medium text-slate-500 mb-0.5">
            {unit}
          </span>
        )}
      </div>
      {trend && trendLabel && (
        <div
          className={`flex items-center gap-1 text-xs font-medium ${
            trend === "up"
              ? "text-emerald-600"
              : trend === "down"
              ? "text-red-500"
              : "text-slate-500"
          }`}
        >
          {trend === "up" && <TrendingUp className="w-3 h-3" />}
          {trend === "down" && <TrendingDown className="w-3 h-3" />}
          <span>{trendLabel}</span>
        </div>
      )}
    </div>
  );
}
