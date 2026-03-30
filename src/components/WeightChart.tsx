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

export default function WeightChart() {
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
      <div className="bg-slate-800 rounded-2xl p-4">
        <p className="text-xs text-slate-400 font-medium mb-2">Weight Trend (30 days)</p>
        <div className="h-40 flex items-center justify-center text-slate-500 text-sm">
          No weight data yet. Start logging!
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-800 rounded-2xl p-4">
      <p className="text-xs text-slate-400 font-medium mb-2">Weight Trend (30 days)</p>
      <ResponsiveContainer width="100%" height={180}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 10, fill: "#94a3b8" }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            domain={["dataMin - 1", "dataMax + 1"]}
            tick={{ fontSize: 10, fill: "#94a3b8" }}
            tickLine={false}
            axisLine={false}
            width={35}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "#1e293b",
              border: "1px solid #334155",
              borderRadius: "8px",
              fontSize: "12px",
              color: "#fff",
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
