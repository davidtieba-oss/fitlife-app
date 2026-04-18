"use client";

import { useEffect, useState } from "react";
import { format, differenceInDays, startOfWeek, isAfter } from "date-fns";
import {
  Scale,
  Utensils,
  Dumbbell,
  TrendingUp,
  TrendingDown,
  Flame,
  Droplets,
  Bell,
  Quote,
  Play,
} from "lucide-react";
import Link from "next/link";
import {
  getMetrics,
  getDailyMacros,
  getWorkouts,
  getSettings,
  getMacroTargets,
  getPlannedWorkoutForDay,
  computeStreak,
  getActivityDaysThisWeek,
  getReminders,
} from "@/lib/storage";
import WaterTracker from "@/components/WaterTracker";
import WeightChart from "@/components/WeightChart";
import { DashboardSkeleton } from "@/components/Skeleton";
import { getDailyQuote } from "@/data/quotes";

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

const DAY_LABELS = ["M", "T", "W", "T", "F", "S", "S"];

export default function Dashboard() {
  const [mounted, setMounted] = useState(false);
  const today = format(new Date(), "yyyy-MM-dd");

  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return <DashboardSkeleton />;
  }

  const metrics = getMetrics();
  const lastWeight = metrics[0];
  const prevWeight = metrics[1];
  const weightDiff =
    lastWeight && prevWeight ? lastWeight.weight - prevWeight.weight : 0;
  const settings = getSettings();
  const macroTargets = getMacroTargets(settings);
  const dailyMacros = getDailyMacros(today);
  const workouts = getWorkouts();
  const lastWorkout = workouts[0];
  const todayDayName = format(new Date(), "EEEE");
  const plannedWorkout = getPlannedWorkoutForDay(todayDayName);
  const lastWorkoutDays = lastWorkout
    ? differenceInDays(new Date(), new Date(lastWorkout.date))
    : null;

  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
  const workoutsThisWeek = workouts.filter((w) =>
    isAfter(new Date(w.date), weekStart)
  ).length;

  const calPct = settings.calorieTarget > 0
    ? Math.min(dailyMacros.calories / settings.calorieTarget, 1)
    : 0;
  const calBarColor =
    dailyMacros.calories > settings.calorieTarget
      ? "bg-red-500"
      : dailyMacros.calories > settings.calorieTarget * 0.85
      ? "bg-yellow-500"
      : "bg-teal-500";

  const streak = computeStreak();
  const activityDays = getActivityDaysThisWeek();
  const quote = getDailyQuote();
  const reminders = getReminders();
  const hasActiveReminders = reminders.weighIn || reminders.meals || reminders.workout || reminders.water;
  const notificationsDenied = typeof Notification !== "undefined" && Notification.permission === "denied";
  const showReminderBanner = hasActiveReminders && notificationsDenied;

  return (
    <div className="space-y-4">
      {/* Reminder Banner */}
      {showReminderBanner && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/50 rounded-xl px-4 py-2.5 flex items-center gap-2">
          <Bell size={16} className="text-amber-500 shrink-0" />
          <p className="text-xs text-amber-700 dark:text-amber-300">
            Reminders active:
            {reminders.weighIn && " Weigh-in"}
            {reminders.meals && " Meals"}
            {reminders.workout && " Workout"}
            {reminders.water && " Water"}
          </p>
        </div>
      )}

      {/* Header with streak */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">{getGreeting()}!</h1>
          <p className="text-sm text-gray-500 dark:text-slate-400">
            {format(new Date(), "EEEE, MMMM d")}
          </p>
        </div>
        {streak > 0 && (
          <div className="flex items-center gap-1.5 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-700/30 rounded-full px-3 py-1.5">
            <Flame size={16} className="text-orange-500" />
            <span className="text-sm font-bold text-orange-600 dark:text-orange-400">{streak}</span>
            <span className="text-[10px] text-orange-500 dark:text-orange-400/70">day{streak !== 1 ? "s" : ""}</span>
          </div>
        )}
      </div>

      {/* Weekly Activity Bar */}
      <div className="bg-gray-100 dark:bg-slate-800 rounded-xl px-4 py-3">
        <p className="text-[10px] text-gray-500 dark:text-slate-400 font-medium mb-2">This Week</p>
        <div className="flex justify-between">
          {DAY_LABELS.map((label, i) => {
            const active = activityDays.has(i);
            return (
              <div key={i} className="flex flex-col items-center gap-1.5">
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center transition-all ${
                    active
                      ? "bg-teal-500 text-white scale-110"
                      : "bg-gray-200 dark:bg-slate-700 text-gray-400 dark:text-slate-500"
                  }`}
                >
                  <span className="text-[10px] font-bold">{label}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Motivational Quote */}
      <div className="flex items-start gap-2.5 px-1">
        <Quote size={14} className="text-teal-400 shrink-0 mt-0.5" />
        <p className="text-xs text-gray-500 dark:text-slate-400 italic leading-relaxed">{quote}</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-3">
        {/* Weight */}
        <div className="bg-gray-100 dark:bg-slate-800 rounded-2xl p-4">
          <p className="text-xs text-gray-500 dark:text-slate-400 font-medium mb-1">Weight</p>
          {lastWeight ? (
            <div className="flex items-end gap-1.5">
              <span className="text-2xl font-bold text-gray-900 dark:text-white">{lastWeight.weight}</span>
              <span className="text-xs text-gray-500 dark:text-slate-400 mb-1">kg</span>
              {weightDiff !== 0 && (
                <span
                  className={`flex items-center text-xs ml-auto mb-1 ${
                    weightDiff > 0 ? "text-red-400" : "text-green-400"
                  }`}
                >
                  {weightDiff > 0 ? (
                    <TrendingUp size={14} />
                  ) : (
                    <TrendingDown size={14} />
                  )}
                  <span className="ml-0.5">
                    {Math.abs(weightDiff).toFixed(1)}
                  </span>
                </span>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-2 text-gray-400 dark:text-slate-500">
              <Scale size={24} className="mb-1 opacity-50" />
              <p className="text-[10px]">Not logged yet</p>
            </div>
          )}
        </div>

        {/* Water */}
        <WaterTracker />

        {/* Nutrition */}
        <div className="bg-gray-100 dark:bg-slate-800 rounded-2xl p-4 col-span-2">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-gray-500 dark:text-slate-400 font-medium">Nutrition Today</p>
            {dailyMacros.calories === 0 && (
              <Link
                href="/log"
                className="text-[10px] text-teal-500 dark:text-teal-400 hover:text-teal-400 dark:hover:text-teal-300 font-medium"
              >
                + Log meal
              </Link>
            )}
          </div>
          {dailyMacros.calories === 0 ? (
            <Link href="/log" className="block">
              <div className="flex flex-col items-center py-3 text-gray-400 dark:text-slate-500">
                <Utensils size={28} className="mb-1.5 opacity-50" />
                <p className="text-sm">No meals logged yet — tap to add</p>
              </div>
            </Link>
          ) : (
            <>
              <div className="flex items-end gap-1.5 mb-1.5">
                <span className="text-2xl font-bold text-gray-900 dark:text-white">
                  {dailyMacros.calories}
                </span>
                <span className="text-xs text-gray-500 dark:text-slate-400 mb-1">
                  / {settings.calorieTarget} cal
                </span>
              </div>
              <div className="h-1.5 bg-gray-200 dark:bg-slate-700 rounded-full overflow-hidden mb-3">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${calBarColor}`}
                  style={{ width: `${calPct * 100}%` }}
                />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <MacroRing
                  label="Protein"
                  value={dailyMacros.protein}
                  target={macroTargets.protein}
                  color="#0d9488"
                />
                <MacroRing
                  label="Carbs"
                  value={dailyMacros.carbs}
                  target={macroTargets.carbs}
                  color="#06b6d4"
                />
                <MacroRing
                  label="Fat"
                  value={dailyMacros.fat}
                  target={macroTargets.fat}
                  color="#f59e0b"
                />
              </div>
            </>
          )}
        </div>

        {/* Today's Planned Workout */}
        {plannedWorkout && (
          <div className="bg-gradient-to-r from-violet-600/10 dark:from-violet-600/20 to-teal-600/10 dark:to-teal-600/20 border border-violet-300/30 dark:border-violet-500/20 rounded-2xl p-4 col-span-2">
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <p className="text-xs text-violet-500 dark:text-violet-400 font-medium mb-1">
                  Today&apos;s Planned Workout
                </p>
                <p className="text-sm font-semibold text-gray-900 dark:text-white">{plannedWorkout.workout_name}</p>
                <p className="text-[10px] text-gray-500 dark:text-slate-400 mt-0.5">
                  {plannedWorkout.exercises.length} exercises
                </p>
              </div>
              <Link
                href="/workouts"
                className="flex items-center gap-1.5 bg-violet-600 hover:bg-violet-500 text-white px-4 py-2 rounded-xl text-xs font-semibold transition active:scale-[0.98]"
              >
                <Play size={14} /> Start
              </Link>
            </div>
          </div>
        )}

        {/* Last Workout */}
        <div className="bg-gray-100 dark:bg-slate-800 rounded-2xl p-4 col-span-2">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500 dark:text-slate-400 font-medium mb-1">
                Last Workout
              </p>
              {lastWorkout ? (
                <>
                  <p className="text-sm font-semibold truncate text-gray-900 dark:text-white">
                    {lastWorkout.name}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-slate-400">
                    {lastWorkoutDays === 0
                      ? "Today"
                      : lastWorkoutDays === 1
                      ? "Yesterday"
                      : `${lastWorkoutDays} days ago`}{" "}
                    · {lastWorkout.exercises.length} exercise
                    {lastWorkout.exercises.length !== 1 && "s"} ·{" "}
                    {lastWorkout.duration}m
                  </p>
                </>
              ) : (
                <div className="flex items-center gap-2 text-gray-400 dark:text-slate-500">
                  <Dumbbell size={20} className="opacity-50" />
                  <p className="text-sm">No workouts yet</p>
                </div>
              )}
            </div>
            <div className="flex items-center gap-2 bg-teal-50 dark:bg-teal-600/20 rounded-lg px-3 py-2">
              <Flame size={16} className="text-teal-500 dark:text-teal-400" />
              <div className="text-right">
                <p className="text-sm font-bold text-teal-600 dark:text-teal-300">
                  {workoutsThisWeek}
                </p>
                <p className="text-[9px] text-gray-500 dark:text-slate-400">this week</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="flex gap-2">
        <Link
          href="/log"
          className="flex-1 flex items-center justify-center gap-2 bg-teal-600 hover:bg-teal-500 hover:scale-[1.02] text-white py-3.5 rounded-xl text-sm font-medium transition-all active:scale-[0.98]"
        >
          <Scale size={20} /> Log Weight
        </Link>
        <Link
          href="/log"
          className="flex-1 flex items-center justify-center gap-2 bg-gray-200 dark:bg-slate-700 hover:bg-gray-300 dark:hover:bg-slate-600 hover:scale-[1.02] text-gray-900 dark:text-white py-3.5 rounded-xl text-sm font-medium transition-all active:scale-[0.98]"
        >
          <Utensils size={20} /> Log Meal
        </Link>
        <Link
          href="/workouts"
          className="flex-1 flex items-center justify-center gap-2 bg-gray-200 dark:bg-slate-700 hover:bg-gray-300 dark:hover:bg-slate-600 hover:scale-[1.02] text-gray-900 dark:text-white py-3.5 rounded-xl text-sm font-medium transition-all active:scale-[0.98]"
        >
          <Dumbbell size={20} /> Workout
        </Link>
      </div>

      {/* Weight Chart */}
      <WeightChart />
    </div>
  );
}

function MacroRing({
  label,
  value,
  target,
  color,
}: {
  label: string;
  value: number;
  target: number;
  color: string;
}) {
  const pct = target > 0 ? Math.min(value / target, 1) : 0;
  const circumference = 2 * Math.PI * 20;
  const offset = circumference * (1 - pct);
  const statusColor =
    value > target ? "#ef4444" : value > target * 0.85 ? "#eab308" : color;
  const pctLabel = target > 0 ? Math.round((value / target) * 100) : 0;

  return (
    <div className="flex flex-col items-center">
      <div className="relative w-12 h-12 mb-1">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 48 48">
          <circle
            cx="24"
            cy="24"
            r="20"
            fill="none"
            stroke="currentColor"
            strokeWidth="3.5"
            className="text-gray-200 dark:text-slate-700"
          />
          <circle
            cx="24"
            cy="24"
            r="20"
            fill="none"
            stroke={statusColor}
            strokeWidth="3.5"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            className="transition-all duration-500"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-[10px] font-bold text-gray-900 dark:text-white">{pctLabel}%</span>
        </div>
      </div>
      <span className="text-[10px] text-gray-600 dark:text-slate-300 font-medium">{label}</span>
      <span className="text-[9px] text-gray-400 dark:text-slate-500">
        {value}g / {target}g
      </span>
    </div>
  );
}
