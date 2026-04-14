"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ReferenceLine,
} from "recharts";

interface PMCDataPoint {
  date: string;
  ctl: number; // Chronic Training Load (fitness)
  atl: number; // Acute Training Load (fatigue)
  tsb: number; // Training Stress Balance (form)
}

interface PMCChartProps {
  data: PMCDataPoint[];
  height?: number;
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-slate-900 rounded-lg p-3 text-xs text-white space-y-1 shadow-lg">
      <p className="font-medium text-slate-300 mb-1">{label}</p>
      {payload.map((p: any) => (
        <div key={p.name} className="flex items-center gap-2">
          <span
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: p.color }}
          />
          <span className="text-slate-400 capitalize">{p.name}:</span>
          <span className="font-medium">{p.value.toFixed(1)}</span>
        </div>
      ))}
    </div>
  );
};

export default function PMCChart({ data, height = 280 }: PMCChartProps) {
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
          tick={{ fontSize: 11, fill: "#94a3b8" }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip content={<CustomTooltip />} />
        <Legend
          wrapperStyle={{ fontSize: 12, paddingTop: 12 }}
          formatter={(value: string) =>
            value === "ctl"
              ? "CTL (Fitness)"
              : value === "atl"
              ? "ATL (Fatigue)"
              : "TSB (Form)"
          }
        />
        <ReferenceLine y={0} stroke="#cbd5e1" strokeWidth={1} />
        <Line
          type="monotone"
          dataKey="ctl"
          stroke="#14b8a6"
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 4 }}
        />
        <Line
          type="monotone"
          dataKey="atl"
          stroke="#f97316"
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 4 }}
        />
        <Line
          type="monotone"
          dataKey="tsb"
          stroke="#3b82f6"
          strokeWidth={2}
          dot={false}
          strokeDasharray="5 3"
          activeDot={{ r: 4 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
