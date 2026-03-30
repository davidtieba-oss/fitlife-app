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
import { format, parseISO, subDays } from "date-fns";
import {
  TrendingUp,
  TrendingDown,
  ArrowRight,
  ChevronsUp,
  ChevronsDown,
  BarChart3,
} from "lucide-react";
import { type MetricEntry } from "@/lib/storage";
import { computeMovingAverage, computeWeightStats } from "@/lib/progress-utils";

const TOOLTIP_STYLE = {
  backgroundColor: "#1e293b",
  border: "1px solid #334155",
  borderRadius: "8px",
  fontSize: "12px",
  color: "#fff",
};

interface Props {
  metrics: MetricEntry[];
  period: number; // 0 = all
  onPeriodChange: (p: number) => void;
}

const PERIODS = [
  { value: 30, label: "30d" },
  { value: 90, label: "90d" },
  { value: 180, label: "6mo" },
  { value: 0, label: "All" },
];

export default function WeightTab({ metrics, period, onPeriodChange }: Props) {
  const chartData = useMemo(() => {
    const cutoff = period > 0 ? subDays(new Date(), period) : new Date(0);
    const filtered = metrics
      .filter((m) => new Date(m.date) >= cutoff)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .map((m) => ({
        date: format(parseISO(m.date), "MMM d"),
        weight: m.weight,
        bodyFat: m.bodyFat ?? null,
      }));
    return computeMovingAverage(filtered);
  }, [metrics, period]);

  const stats = useMemo(
    () => computeWeightStats(metrics, period),
    [metrics, period]
  );

  return (
    <div className="space-y-3">
      {/* Period selector */}
      <div className="flex gap-2">
        {PERIODS.map((p) => (
          <button
            key={p.value}
            onClick={() => onPeriodChange(p.value)}
            className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition ${
              period === p.value
                ? "bg-teal-600 text-white"
                : "bg-slate-800 text-slate-400 hover:bg-slate-700"
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Weight chart */}
      <div className="bg-slate-800 rounded-2xl p-4">
        <p className="text-xs text-slate-400 font-medium mb-2">
          Weight · <span className="text-cyan-400">7-day avg</span>
        </p>
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
              <Tooltip contentStyle={TOOLTIP_STYLE} />
              <Line
                type="monotone"
                dataKey="weight"
                stroke="#0d9488"
                strokeWidth={2}
                dot={{ r: 2.5, fill: "#0d9488" }}
                name="Weight"
              />
              <Line
                type="monotone"
                dataKey="movingAvg"
                stroke="#06b6d4"
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={false}
                connectNulls={false}
                name="7-day avg"
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-40 flex items-center justify-center text-slate-500 text-sm">
            No weight data for this period.
          </div>
        )}
      </div>

      {/* Body fat chart */}
      {chartData.some((d) => d.bodyFat !== null) && (
        <div className="bg-slate-800 rounded-2xl p-4">
          <p className="text-xs text-slate-400 font-medium mb-2">Body Fat %</p>
          <ResponsiveContainer width="100%" height={180}>
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
              <Tooltip contentStyle={TOOLTIP_STYLE} />
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

      {/* Stats */}
      {stats.startWeight !== null && (
        <div className="space-y-3">
          {/* Journey card */}
          <div className="bg-slate-800 rounded-2xl p-4">
            <p className="text-xs text-slate-400 font-medium mb-3">Journey</p>
            <div className="flex items-center justify-between">
              <div className="text-center">
                <p className="text-lg font-bold">{stats.startWeight}</p>
                <p className="text-[10px] text-slate-400">Start (kg)</p>
              </div>
              <ArrowRight size={16} className="text-slate-500" />
              <div className="text-center">
                <p className="text-lg font-bold">{stats.currentWeight}</p>
                <p className="text-[10px] text-slate-400">Current (kg)</p>
              </div>
              <ArrowRight size={16} className="text-slate-500" />
              <div className="text-center">
                <p
                  className={`text-lg font-bold ${
                    stats.change! < 0
                      ? "text-green-400"
                      : stats.change! > 0
                      ? "text-red-400"
                      : "text-white"
                  }`}
                >
                  {stats.change! > 0 ? "+" : ""}
                  {stats.change!.toFixed(1)}
                </p>
                <p className="text-[10px] text-slate-400">Change (kg)</p>
              </div>
            </div>
          </div>

          {/* Detail stats */}
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-slate-800 rounded-xl p-3 text-center">
              <ChevronsUp size={16} className="mx-auto text-red-400 mb-1" />
              <p className="text-sm font-bold">{stats.highest}</p>
              <p className="text-[10px] text-slate-400">Highest (kg)</p>
            </div>
            <div className="bg-slate-800 rounded-xl p-3 text-center">
              <ChevronsDown size={16} className="mx-auto text-green-400 mb-1" />
              <p className="text-sm font-bold">{stats.lowest}</p>
              <p className="text-[10px] text-slate-400">Lowest (kg)</p>
            </div>
            <div className="bg-slate-800 rounded-xl p-3 text-center">
              <BarChart3 size={16} className="mx-auto text-cyan-400 mb-1" />
              <p className="text-sm font-bold">
                {stats.avgWeeklyChange !== null
                  ? `${stats.avgWeeklyChange > 0 ? "+" : ""}${stats.avgWeeklyChange}`
                  : "—"}
              </p>
              <p className="text-[10px] text-slate-400">Avg/week (kg)</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
