"use client";

import { useMemo } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { getMetrics } from "@/lib/storage";
import { format, subDays, parseISO } from "date-fns";
import { Scale } from "lucide-react";
import { useTheme } from "@/lib/ThemeProvider";

export default function WeightChart() {
  const { resolvedDark } = useTheme();

  const data = useMemo(() => {
    const metrics = getMetrics();
    const cutoff = subDays(new Date(), 30);
    return metrics
      .filter((m) => new Date(m.date) >= cutoff)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .map((m) => ({
        date: format(parseISO(m.date), "MMM d"),
        weight: m.weight,
      }));
  }, []);

  if (data.length === 0) {
    return (
      <div className="bg-gray-100 dark:bg-slate-800 rounded-2xl p-4">
        <p className="text-xs text-gray-500 dark:text-slate-400 font-medium mb-2">Weight Trend (30 days)</p>
        <div className="h-40 flex flex-col items-center justify-center text-gray-400 dark:text-slate-500 gap-2">
          <Scale size={32} className="opacity-40" />
          <span className="text-sm">No weight data yet. Start logging!</span>
        </div>
      </div>
    );
  }

  const gridColor = resolvedDark ? "#334155" : "#e2e8f0";
  const tickColor = resolvedDark ? "#94a3b8" : "#64748b";
  const tooltipBg = resolvedDark ? "#1e293b" : "#ffffff";
  const tooltipBorder = resolvedDark ? "#334155" : "#e2e8f0";
  const tooltipColor = resolvedDark ? "#fff" : "#0f172a";

  return (
    <div className="bg-gray-100 dark:bg-slate-800 rounded-2xl p-4">
      <p className="text-xs text-gray-500 dark:text-slate-400 font-medium mb-2">Weight Trend (30 days)</p>
      <ResponsiveContainer width="100%" height={180}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 10, fill: tickColor }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            domain={["dataMin - 1", "dataMax + 1"]}
            tick={{ fontSize: 10, fill: tickColor }}
            tickLine={false}
            axisLine={false}
            width={35}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: tooltipBg,
              border: `1px solid ${tooltipBorder}`,
              borderRadius: "8px",
              fontSize: "12px",
              color: tooltipColor,
            }}
          />
          <Line
            type="monotone"
            dataKey="weight"
            stroke="#0d9488"
            strokeWidth={2}
            dot={{ r: 3, fill: "#0d9488" }}
            activeDot={{ r: 5 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
