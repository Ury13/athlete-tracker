"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";

interface DayData {
  day: string; // e.g. "Mon"
  calories: number;
}

interface WeeklyCaloriesChartProps {
  data: DayData[];
  target?: number;
  height?: number;
}

export default function WeeklyCaloriesChart({
  data,
  target = 2000,
  height = 220,
}: WeeklyCaloriesChartProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
        <XAxis
          dataKey="day"
          tick={{ fontSize: 12, fill: "#94a3b8" }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={{ fontSize: 12, fill: "#94a3b8" }}
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
          cursor={{ fill: "#f1f5f9" }}
          formatter={(value: number) => [`${value} kcal`, "Calories"]}
        />
        <ReferenceLine
          y={target}
          stroke="#14b8a6"
          strokeDasharray="4 4"
          strokeWidth={1.5}
          label={{
            value: `Target ${target}`,
            position: "right",
            fontSize: 11,
            fill: "#14b8a6",
          }}
        />
        <Bar
          dataKey="calories"
          fill="#14b8a6"
          radius={[4, 4, 0, 0]}
          maxBarSize={40}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
