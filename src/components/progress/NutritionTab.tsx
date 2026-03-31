"use client";

import { useMemo, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  ReferenceLine,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { format, parseISO } from "date-fns";
import {
  Trash2,
  ChevronDown,
  ChevronUp,
  Utensils,
  Target,
} from "lucide-react";
import {
  getDailyMacros,
  getMacroTargets,
  deleteMeal,
  type MealEntry,
  type UserSettings,
} from "@/lib/storage";
import {
  computeDailyCalories,
  computeAverageMacros,
  computeAdherenceScore,
} from "@/lib/progress-utils";

const TOOLTIP_STYLE = {
  backgroundColor: "#1e293b",
  border: "1px solid #334155",
  borderRadius: "8px",
  fontSize: "12px",
  color: "#fff",
};

const MACRO_COLORS = ["#0d9488", "#06b6d4", "#f59e0b"];

interface Props {
  meals: MealEntry[];
  settings: UserSettings;
  onMealsChange: (meals: MealEntry[]) => void;
}

export default function NutritionTab({ meals, settings, onMealsChange }: Props) {
  const [expandedDay, setExpandedDay] = useState<string | null>(null);

  const calorieData = useMemo(() => computeDailyCalories(meals, 30), [meals]);
  const avgMacros = useMemo(() => computeAverageMacros(meals, 30), [meals]);
  const adherence = useMemo(
    () => computeAdherenceScore(meals, settings.calorieTarget, 30),
    [meals, settings.calorieTarget]
  );
  const macroTargets = getMacroTargets(settings);

  const pieData = useMemo(() => {
    if (avgMacros.daysWithData === 0) return [];
    return [
      { name: "Protein", value: avgMacros.avgProtein, unit: "g" },
      { name: "Carbs", value: avgMacros.avgCarbs, unit: "g" },
      { name: "Fat", value: avgMacros.avgFat, unit: "g" },
    ];
  }, [avgMacros]);

  // Meal history grouped by date
  const mealsByDay = useMemo(() => {
    const grouped: Record<string, MealEntry[]> = {};
    for (const m of meals) {
      if (!grouped[m.date]) grouped[m.date] = [];
      grouped[m.date].push(m);
    }
    return Object.entries(grouped)
      .sort(([a], [b]) => new Date(b).getTime() - new Date(a).getTime())
      .slice(0, 14);
  }, [meals]);

  function handleDeleteMeal(id: string) {
    deleteMeal(id);
    onMealsChange(meals.filter((m) => m.id !== id));
  }

  // Adherence ring
  const adherenceCirc = 2 * Math.PI * 36;
  const adherenceOffset = adherenceCirc * (1 - adherence.score / 100);
  const adherenceColor =
    adherence.score >= 80
      ? "#22c55e"
      : adherence.score >= 60
      ? "#eab308"
      : "#ef4444";

  return (
    <div className="space-y-3">
      {/* Calorie chart with target line */}
      <div className="bg-gray-100 dark:bg-slate-800 rounded-2xl p-4">
        <p className="text-xs text-gray-500 dark:text-slate-400 font-medium mb-2">
          Daily Calories (30 days)
        </p>
        {calorieData.length > 0 ? (
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={calorieData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 9, fill: "#94a3b8" }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                tick={{ fontSize: 10, fill: "#94a3b8" }}
                tickLine={false}
                axisLine={false}
                width={35}
              />
              <Tooltip contentStyle={TOOLTIP_STYLE} />
              <ReferenceLine
                y={settings.calorieTarget}
                stroke="#f59e0b"
                strokeDasharray="6 3"
                strokeWidth={1.5}
                label={{
                  value: "Target",
                  position: "insideTopRight",
                  fill: "#f59e0b",
                  fontSize: 10,
                }}
              />
              <Line
                type="monotone"
                dataKey="calories"
                stroke="#0d9488"
                strokeWidth={2}
                dot={{ r: 2.5, fill: "#0d9488" }}
                name="Calories"
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-36 flex items-center justify-center text-gray-400 dark:text-slate-500 text-sm">
            No meal data for this period.
          </div>
        )}
      </div>

      {/* Average macros pie + adherence */}
      <div className="grid grid-cols-2 gap-3">
        {/* Macro pie */}
        <div className="bg-gray-100 dark:bg-slate-800 rounded-2xl p-4">
          <p className="text-xs text-gray-500 dark:text-slate-400 font-medium mb-1">Avg Macros/Day</p>
          {pieData.length > 0 ? (
            <>
              <div className="flex justify-center">
                <PieChart width={120} height={120}>
                  <Pie
                    data={pieData}
                    cx={60}
                    cy={60}
                    innerRadius={30}
                    outerRadius={50}
                    dataKey="value"
                    stroke="none"
                  >
                    {pieData.map((_, i) => (
                      <Cell key={i} fill={MACRO_COLORS[i]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={TOOLTIP_STYLE} />
                </PieChart>
              </div>
              <div className="flex justify-center gap-3 mt-1">
                {pieData.map((d, i) => (
                  <div key={d.name} className="flex items-center gap-1">
                    <div
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: MACRO_COLORS[i] }}
                    />
                    <span className="text-[9px] text-gray-500 dark:text-slate-400">
                      {d.name} {d.value}g
                    </span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="h-32 flex items-center justify-center text-gray-400 dark:text-slate-500 text-xs">
              No data
            </div>
          )}
        </div>

        {/* Adherence score */}
        <div className="bg-gray-100 dark:bg-slate-800 rounded-2xl p-4 flex flex-col items-center">
          <p className="text-xs text-gray-500 dark:text-slate-400 font-medium mb-2">Adherence</p>
          <div className="relative w-20 h-20 mb-1">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 80 80">
              <circle
                cx="40"
                cy="40"
                r="36"
                fill="none"
                stroke="#334155"
                strokeWidth="5"
              />
              <circle
                cx="40"
                cy="40"
                r="36"
                fill="none"
                stroke={adherenceColor}
                strokeWidth="5"
                strokeLinecap="round"
                strokeDasharray={adherenceCirc}
                strokeDashoffset={adherenceOffset}
                className="transition-all duration-700"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-xl font-bold" style={{ color: adherenceColor }}>
                {adherence.score}%
              </span>
            </div>
          </div>
          <p className="text-[10px] text-gray-500 dark:text-slate-400 text-center">
            {adherence.daysOnTarget}/{adherence.totalDays} days within
            <br />
            ±10% of target
          </p>
        </div>
      </div>

      {/* Avg daily summary */}
      {avgMacros.daysWithData > 0 && (
        <div className="bg-gray-100 dark:bg-slate-800 rounded-xl px-4 py-2.5 flex items-center justify-between">
          <span className="text-xs text-gray-500 dark:text-slate-400">
            Avg daily ({avgMacros.daysWithData} days)
          </span>
          <span className="text-xs text-gray-600 dark:text-slate-300">
            {avgMacros.avgCalories} cal · P {avgMacros.avgProtein}g · C{" "}
            {avgMacros.avgCarbs}g · F {avgMacros.avgFat}g
          </span>
        </div>
      )}

      {/* Meal history */}
      <div className="space-y-2">
        <p className="text-xs text-gray-500 dark:text-slate-400 font-medium">Meal History</p>
        {mealsByDay.length === 0 ? (
          <div className="text-center py-8 text-gray-400 dark:text-slate-500">
            <Utensils size={32} className="mx-auto mb-2 opacity-50" />
            <p className="text-sm">No meals logged yet.</p>
          </div>
        ) : (
          mealsByDay.map(([dayDate, dayMeals]) => {
            const expanded = expandedDay === dayDate;
            const dayMacros = getDailyMacros(dayDate);
            const calPct =
              settings.calorieTarget > 0
                ? Math.round((dayMacros.calories / settings.calorieTarget) * 100)
                : 0;
            const calColor =
              dayMacros.calories > settings.calorieTarget
                ? "text-red-400"
                : dayMacros.calories > settings.calorieTarget * 0.85
                ? "text-yellow-400"
                : "text-teal-400";
            const types = ["Breakfast", "Lunch", "Dinner", "Snack"] as const;
            const grouped = types
              .map((t) => ({ type: t, items: dayMeals.filter((m) => m.mealType === t) }))
              .filter((g) => g.items.length > 0);

            return (
              <div key={dayDate} className="bg-gray-100 dark:bg-slate-800 rounded-xl overflow-hidden">
                <button
                  onClick={() => setExpandedDay(expanded ? null : dayDate)}
                  className="w-full px-4 py-3 flex items-center justify-between text-left"
                >
                  <div>
                    <p className="text-sm font-semibold">
                      {format(parseISO(dayDate), "EEEE, MMM d")}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">
                      {dayMeals.length} item{dayMeals.length !== 1 && "s"} ·{" "}
                      <span className={calColor}>
                        {dayMacros.calories} cal ({calPct}%)
                      </span>
                    </p>
                  </div>
                  {expanded ? (
                    <ChevronUp size={16} className="text-gray-500 dark:text-slate-400 shrink-0" />
                  ) : (
                    <ChevronDown size={16} className="text-gray-500 dark:text-slate-400 shrink-0" />
                  )}
                </button>
                {expanded && (
                  <div className="px-4 pb-3 space-y-2 border-t border-gray-200/50 dark:border-slate-700/50 pt-2">
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
                              <p className="text-xs font-medium text-gray-900 dark:text-white truncate">
                                {m.foodName}
                              </p>
                              <p className="text-[10px] text-gray-500 dark:text-slate-400">
                                {m.calories} cal · P {m.protein}g · C {m.carbs}g · F{" "}
                                {m.fat}g
                              </p>
                            </div>
                            <button
                              onClick={() => handleDeleteMeal(m.id)}
                              className="text-gray-400 dark:text-slate-500 hover:text-red-400 p-1 transition ml-2"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        ))}
                      </div>
                    ))}
                    <div className="bg-gray-200/50 dark:bg-slate-700/50 rounded-lg px-3 py-2 flex items-center justify-between mt-1">
                      <span className="text-[10px] text-gray-600 dark:text-slate-300 font-medium">
                        Day Total
                      </span>
                      <span className="text-[10px] text-gray-500 dark:text-slate-400">
                        {dayMacros.calories} cal · P {dayMacros.protein}g · C{" "}
                        {dayMacros.carbs}g · F {dayMacros.fat}g
                      </span>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
