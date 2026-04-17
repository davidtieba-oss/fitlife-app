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
} from "lucide-react";
import Link from "next/link";
import {
  getMetrics,
  getDailyMacros,
  getWorkouts,
  getSettings,
  getMacroTargets,
  getPlannedWorkoutForDay,
} from "@/lib/storage";
import WaterTracker from "@/components/WaterTracker";
import WeightChart from "@/components/WeightChart";
import { Card } from "@/components/ui";

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

export default function Dashboard() {
  const [mounted, setMounted] = useState(false);
  const today = format(new Date(), "yyyy-MM-dd");

  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return (
      <div className="h-screen flex items-center justify-center text-muted">
        Loading...
      </div>
    );
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
    dailyMacros.calories > settings.calorieTarget ? "bg-danger" : "bg-primary";

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold">{getGreeting()}!</h1>
        <p className="text-sm text-muted">
          {format(new Date(), "EEEE, MMMM d")}
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-3">
        {/* Weight */}
        <Card title="Weight">
          {lastWeight ? (
            <div className="flex items-end gap-1.5">
              <span className="text-2xl font-bold">{lastWeight.weight}</span>
              <span className="text-xs text-muted mb-1">kg</span>
              {weightDiff !== 0 && (
                <span
                  className={`flex items-center text-xs ml-auto mb-1 ${
                    weightDiff > 0 ? "text-danger" : "text-success"
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
            <p className="text-sm text-muted">Not logged yet</p>
          )}
        </Card>

        {/* Water */}
        <WaterTracker />

        {/* Nutrition */}
        <Card className="col-span-2">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-muted font-medium">Nutrition Today</p>
            {dailyMacros.calories === 0 && (
              <Link
                href="/log"
                className="text-[10px] text-primary hover:text-primary-muted font-medium"
              >
                + Log meal
              </Link>
            )}
          </div>
          {dailyMacros.calories === 0 ? (
            <Link href="/log" className="block">
              <p className="text-sm text-muted">
                No meals logged yet — tap to add
              </p>
            </Link>
          ) : (
            <>
              <div className="flex items-end gap-1.5 mb-1.5">
                <span className="text-2xl font-bold">
                  {dailyMacros.calories}
                </span>
                <span className="text-xs text-muted mb-1">
                  / {settings.calorieTarget} cal
                </span>
              </div>
              <div className="h-1.5 bg-surface-muted rounded-full overflow-hidden mb-3">
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
        </Card>

        {/* Today's Planned Workout */}
        {plannedWorkout && (
          <Link
            href="/workouts"
            className="bg-gradient-to-r from-accent/20 to-primary/20 border border-accent/20 rounded-2xl p-4 col-span-2 block hover:from-accent/30 hover:to-primary/30 transition"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-accent font-medium mb-1">
                  Today&apos;s Planned Workout
                </p>
                <p className="text-sm font-semibold">{plannedWorkout.workout_name}</p>
                <p className="text-[10px] text-muted mt-0.5">
                  {plannedWorkout.exercises.length} exercises · Tap to start
                </p>
              </div>
              <div className="bg-accent/30 rounded-lg p-2">
                <Dumbbell size={18} className="text-accent" />
              </div>
            </div>
          </Link>
        )}

        {/* Last Workout */}
        <Card className="col-span-2">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted font-medium mb-1">
                Last Workout
              </p>
              {lastWorkout ? (
                <>
                  <p className="text-sm font-semibold truncate">
                    {lastWorkout.name}
                  </p>
                  <p className="text-xs text-muted">
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
                <p className="text-sm text-muted">No workouts yet</p>
              )}
            </div>
            <div className="flex items-center gap-2 bg-primary/20 rounded-lg px-3 py-2">
              <Flame size={16} className="text-primary" />
              <div className="text-right">
                <p className="text-sm font-bold text-primary">
                  {workoutsThisWeek}
                </p>
                <p className="text-[9px] text-muted">this week</p>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="flex gap-2">
        <Link
          href="/log"
          className="flex-1 flex items-center justify-center gap-1.5 bg-primary hover:bg-primary-muted text-white py-2.5 rounded-xl text-sm font-medium transition active:scale-[0.98]"
        >
          <Scale size={16} /> Log Weight
        </Link>
        <Link
          href="/log"
          className="flex-1 flex items-center justify-center gap-1.5 bg-surface-muted hover:bg-surface text-white py-2.5 rounded-xl text-sm font-medium transition active:scale-[0.98]"
        >
          <Utensils size={16} /> Log Meal
        </Link>
        <Link
          href="/workouts"
          className="flex-1 flex items-center justify-center gap-1.5 bg-surface-muted hover:bg-surface text-white py-2.5 rounded-xl text-sm font-medium transition active:scale-[0.98]"
        >
          <Dumbbell size={16} /> Workout
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
            stroke="#334155"
            strokeWidth="3.5"
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
          <span className="text-[10px] font-bold text-white">{pctLabel}%</span>
        </div>
      </div>
      <span className="text-[10px] text-foreground font-medium">{label}</span>
      <span className="text-[9px] text-muted">
        {value}g / {target}g
      </span>
    </div>
  );
}
