"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";

interface WeightDataPoint {
  date: string; // e.g. "Jan 1"
  weight: number | null;
}

interface WeightTrendChartProps {
  data: WeightDataPoint[];
  goalWeight?: number | null;
  height?: number;
}

export default function WeightTrendChart({
  data,
  goalWeight,
  height = 220,
}: WeightTrendChartProps) {
  const weights = data.map((d) => d.weight).filter(Boolean) as number[];
  const minY = weights.length ? Math.floor(Math.min(...weights) - 2) : 50;
  const maxY = weights.length ? Math.ceil(Math.max(...weights) + 2) : 100;

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
        <XAxis
          dataKey="date"
          tick={{ fontSize: 11, fill: "#94a3b8" }}
          axisLine={false}
          tickLine={false}
          interval="preserveStartEnd"
        />
        <YAxis
          domain={[minY, maxY]}
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
          formatter={(value: number) => [`${value} kg`, "Weight"]}
        />
        {goalWeight && (
          <ReferenceLine
            y={goalWeight}
            stroke="#3b82f6"
            strokeDasharray="4 4"
            strokeWidth={1.5}
            label={{
              value: `Goal ${goalWeight}kg`,
              position: "right",
              fontSize: 11,
              fill: "#3b82f6",
            }}
          />
        )}
        <Line
          type="monotone"
          dataKey="weight"
          stroke="#14b8a6"
          strokeWidth={2}
          dot={{ r: 3, fill: "#14b8a6", strokeWidth: 0 }}
          connectNulls
          activeDot={{ r: 5 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
