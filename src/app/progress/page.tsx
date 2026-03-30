"use client";

import { useEffect, useState, useMemo } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { getMetrics, getWorkouts, type MetricEntry } from "@/lib/storage";
import { format, parseISO, subDays } from "date-fns";
import { TrendingUp, TrendingDown, Activity, Scale } from "lucide-react";

export default function ProgressPage() {
  const [mounted, setMounted] = useState(false);
  const [metrics, setMetrics] = useState<MetricEntry[]>([]);
  const [period, setPeriod] = useState<30 | 60 | 90>(30);

  useEffect(() => {
    setMounted(true);
    setMetrics(getMetrics());
  }, []);

  const chartData = useMemo(() => {
    const cutoff = subDays(new Date(), period);
    return metrics
      .filter((m) => new Date(m.date) >= cutoff)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .map((m) => ({
        date: format(parseISO(m.date), "MMM d"),
        weight: m.weight,
        bodyFat: m.bodyFat ?? null,
      }));
  }, [metrics, period]);

  if (!mounted) {
    return <div className="h-screen flex items-center justify-center text-slate-500">Loading...</div>;
  }

  const workouts = getWorkouts();
  const totalWorkouts = workouts.length;
  const startWeight = metrics.length > 0 ? metrics[metrics.length - 1].weight : null;
  const currentWeight = metrics.length > 0 ? metrics[0].weight : null;
  const totalChange = startWeight && currentWeight ? currentWeight - startWeight : null;

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Progress</h1>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-slate-800 rounded-2xl p-4 flex items-start gap-3">
          <div className="p-2 bg-teal-600/20 rounded-lg">
            <Scale size={20} className="text-teal-400" />
          </div>
          <div>
            <p className="text-xs text-slate-400">Total Change</p>
            {totalChange !== null ? (
              <div className="flex items-center gap-1">
                <span className="text-lg font-bold">
                  {totalChange > 0 ? "+" : ""}
                  {totalChange.toFixed(1)}
                </span>
                <span className="text-xs text-slate-400">kg</span>
                {totalChange < 0 ? (
                  <TrendingDown size={14} className="text-green-400" />
                ) : totalChange > 0 ? (
                  <TrendingUp size={14} className="text-red-400" />
                ) : null}
              </div>
            ) : (
              <p className="text-sm text-slate-500">No data</p>
            )}
          </div>
        </div>
        <div className="bg-slate-800 rounded-2xl p-4 flex items-start gap-3">
          <div className="p-2 bg-cyan-600/20 rounded-lg">
            <Activity size={20} className="text-cyan-400" />
          </div>
          <div>
            <p className="text-xs text-slate-400">Workouts</p>
            <p className="text-lg font-bold">{totalWorkouts}</p>
          </div>
        </div>
      </div>

      {/* Period Selector */}
      <div className="flex gap-2">
        {([30, 60, 90] as const).map((p) => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition ${
              period === p
                ? "bg-teal-600 text-white"
                : "bg-slate-800 text-slate-400 hover:bg-slate-700"
            }`}
          >
            {p} days
          </button>
        ))}
      </div>

      {/* Weight Chart */}
      <div className="bg-slate-800 rounded-2xl p-4">
        <p className="text-xs text-slate-400 font-medium mb-2">Weight</p>
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={chartData}>
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
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-40 flex items-center justify-center text-slate-500 text-sm">
            No data for this period.
          </div>
        )}
      </div>

      {/* Body Fat Chart */}
      {chartData.some((d) => d.bodyFat !== null) && (
        <div className="bg-slate-800 rounded-2xl p-4">
          <p className="text-xs text-slate-400 font-medium mb-2">Body Fat %</p>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={chartData.filter((d) => d.bodyFat !== null)}>
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
                dataKey="bodyFat"
                stroke="#06b6d4"
                strokeWidth={2}
                dot={{ r: 3, fill: "#06b6d4" }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
