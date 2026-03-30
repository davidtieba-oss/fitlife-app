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
import {
  getMetrics,
  getWorkouts,
  getMeals,
  getDailyMacros,
  getSettings,
  getMacroTargets,
  type MetricEntry,
  type MealEntry,
} from "@/lib/storage";
import { format, parseISO, subDays } from "date-fns";
import {
  TrendingUp,
  TrendingDown,
  Activity,
  Scale,
  Trash2,
  ChevronDown,
  ChevronUp,
  Utensils,
} from "lucide-react";

type Section = "weight" | "nutrition";

export default function ProgressPage() {
  const [mounted, setMounted] = useState(false);
  const [metrics, setMetrics] = useState<MetricEntry[]>([]);
  const [meals, setMeals] = useState<MealEntry[]>([]);
  const [period, setPeriod] = useState<30 | 60 | 90>(30);
  const [section, setSection] = useState<Section>("weight");
  const [expandedDay, setExpandedDay] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
    setMetrics(getMetrics());
    setMeals(getMeals());
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

  // Group meals by date (within period)
  const mealsByDay = useMemo(() => {
    const cutoff = subDays(new Date(), period);
    const filtered = meals.filter((m) => new Date(m.date) >= cutoff);
    const grouped: Record<string, MealEntry[]> = {};
    for (const m of filtered) {
      if (!grouped[m.date]) grouped[m.date] = [];
      grouped[m.date].push(m);
    }
    return Object.entries(grouped)
      .sort(([a], [b]) => new Date(b).getTime() - new Date(a).getTime());
  }, [meals, period]);

  if (!mounted) {
    return (
      <div className="h-screen flex items-center justify-center text-slate-500">
        Loading...
      </div>
    );
  }

  const workouts = getWorkouts();
  const totalWorkouts = workouts.length;
  const startWeight =
    metrics.length > 0 ? metrics[metrics.length - 1].weight : null;
  const currentWeight = metrics.length > 0 ? metrics[0].weight : null;
  const totalChange =
    startWeight && currentWeight ? currentWeight - startWeight : null;
  const settings = getSettings();
  const macroTargets = getMacroTargets(settings);

  function handleDeleteMeal(id: string) {
    const updated = meals.filter((m) => m.id !== id);
    setMeals(updated);
    // Sync to storage
    if (typeof window !== "undefined") {
      localStorage.setItem(
        `meals_default`,
        JSON.stringify(updated)
      );
    }
  }

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

      {/* Section toggle */}
      <div className="flex bg-slate-800 rounded-xl p-1">
        <button
          onClick={() => setSection("weight")}
          className={`flex-1 py-2 rounded-lg text-sm font-medium transition ${
            section === "weight" ? "bg-teal-600 text-white" : "text-slate-400"
          }`}
        >
          Weight
        </button>
        <button
          onClick={() => setSection("nutrition")}
          className={`flex-1 py-2 rounded-lg text-sm font-medium transition ${
            section === "nutrition"
              ? "bg-teal-600 text-white"
              : "text-slate-400"
          }`}
        >
          Nutrition
        </button>
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

      {section === "weight" && (
        <>
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
              <p className="text-xs text-slate-400 font-medium mb-2">
                Body Fat %
              </p>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart
                  data={chartData.filter((d) => d.bodyFat !== null)}
                >
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
        </>
      )}

      {section === "nutrition" && (
        <div className="space-y-2">
          {mealsByDay.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              <Utensils size={40} className="mx-auto mb-3 opacity-50" />
              <p className="text-sm">No meals logged in this period.</p>
            </div>
          ) : (
            mealsByDay.map(([dayDate, dayMeals]) => {
              const expanded = expandedDay === dayDate;
              const dayMacros = getDailyMacros(dayDate);
              const calPct =
                settings.calorieTarget > 0
                  ? Math.round(
                      (dayMacros.calories / settings.calorieTarget) * 100
                    )
                  : 0;
              const calColor =
                dayMacros.calories > settings.calorieTarget
                  ? "text-red-400"
                  : dayMacros.calories > settings.calorieTarget * 0.85
                  ? "text-yellow-400"
                  : "text-teal-400";

              // Group by meal type
              const types = ["Breakfast", "Lunch", "Dinner", "Snack"] as const;
              const grouped = types
                .map((t) => ({
                  type: t,
                  items: dayMeals.filter((m) => m.mealType === t),
                }))
                .filter((g) => g.items.length > 0);

              return (
                <div
                  key={dayDate}
                  className="bg-slate-800 rounded-xl overflow-hidden"
                >
                  <button
                    onClick={() =>
                      setExpandedDay(expanded ? null : dayDate)
                    }
                    className="w-full px-4 py-3 flex items-center justify-between text-left"
                  >
                    <div>
                      <p className="text-sm font-semibold">
                        {format(parseISO(dayDate), "EEEE, MMM d")}
                      </p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {dayMeals.length} item{dayMeals.length !== 1 && "s"} ·{" "}
                        <span className={calColor}>
                          {dayMacros.calories} cal ({calPct}%)
                        </span>{" "}
                        · P {dayMacros.protein}g · C {dayMacros.carbs}g · F{" "}
                        {dayMacros.fat}g
                      </p>
                    </div>
                    {expanded ? (
                      <ChevronUp size={16} className="text-slate-400 shrink-0" />
                    ) : (
                      <ChevronDown
                        size={16}
                        className="text-slate-400 shrink-0"
                      />
                    )}
                  </button>
                  {expanded && (
                    <div className="px-4 pb-3 space-y-2 border-t border-slate-700/50 pt-2">
                      {grouped.map(({ type, items }) => (
                        <div key={type}>
                          <p className="text-[10px] text-teal-400 font-semibold uppercase tracking-wider mb-1">
                            {type}
                          </p>
                          {items.map((m) => (
                            <div
                              key={m.id}
                              className="flex items-center justify-between py-1"
                            >
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-medium text-white truncate">
                                  {m.foodName}
                                </p>
                                <p className="text-[10px] text-slate-400">
                                  {m.calories} cal · P {m.protein}g · C{" "}
                                  {m.carbs}g · F {m.fat}g
                                </p>
                              </div>
                              <button
                                onClick={() => handleDeleteMeal(m.id)}
                                className="text-slate-500 hover:text-red-400 p-1 transition ml-2"
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          ))}
                        </div>
                      ))}
                      {/* Daily totals row */}
                      <div className="bg-slate-700/50 rounded-lg px-3 py-2 flex items-center justify-between mt-1">
                        <span className="text-[10px] text-slate-300 font-medium">
                          Day Total
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {dayMacros.calories} cal · P {dayMacros.protein}g · C{" "}
                          {dayMacros.carbs}g · F {dayMacros.fat}g
                        </span>
                      </div>
                      {/* Target comparison */}
                      <div className="grid grid-cols-4 gap-1 mt-1">
                        <TargetBadge
                          label="Cal"
                          value={dayMacros.calories}
                          target={settings.calorieTarget}
                        />
                        <TargetBadge
                          label="P"
                          value={dayMacros.protein}
                          target={macroTargets.protein}
                          unit="g"
                        />
                        <TargetBadge
                          label="C"
                          value={dayMacros.carbs}
                          target={macroTargets.carbs}
                          unit="g"
                        />
                        <TargetBadge
                          label="F"
                          value={dayMacros.fat}
                          target={macroTargets.fat}
                          unit="g"
                        />
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

function TargetBadge({
  label,
  value,
  target,
  unit = "",
}: {
  label: string;
  value: number;
  target: number;
  unit?: string;
}) {
  const pct = target > 0 ? Math.round((value / target) * 100) : 0;
  const color =
    pct > 110
      ? "text-red-400 bg-red-400/10"
      : pct > 85
      ? "text-yellow-400 bg-yellow-400/10"
      : "text-teal-400 bg-teal-400/10";

  return (
    <div className={`rounded-lg px-2 py-1 text-center ${color}`}>
      <p className="text-[10px] font-semibold">
        {label} {pct}%
      </p>
      <p className="text-[9px] opacity-70">
        {value}/{target}
        {unit}
      </p>
    </div>
  );
}
