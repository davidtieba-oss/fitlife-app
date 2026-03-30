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
import { getMetrics, getCalories, getWorkouts, getSettings } from "@/lib/storage";
import WaterTracker from "@/components/WaterTracker";
import WeightChart from "@/components/WeightChart";

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
      <div className="h-screen flex items-center justify-center text-slate-500">
        Loading...
      </div>
    );
  }

  const metrics = getMetrics();
  const lastWeight = metrics[0];
  const prevWeight = metrics[1];
  const weightDiff =
    lastWeight && prevWeight ? lastWeight.weight - prevWeight.weight : 0;
  const calories = getCalories(today);
  const settings = getSettings();
  const workouts = getWorkouts();
  const lastWorkout = workouts[0];
  const lastWorkoutDays = lastWorkout
    ? differenceInDays(new Date(), new Date(lastWorkout.date))
    : null;

  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
  const workoutsThisWeek = workouts.filter((w) =>
    isAfter(new Date(w.date), weekStart)
  ).length;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold">{getGreeting()}!</h1>
        <p className="text-sm text-slate-400">
          {format(new Date(), "EEEE, MMMM d")}
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-3">
        {/* Weight */}
        <div className="bg-slate-800 rounded-2xl p-4">
          <p className="text-xs text-slate-400 font-medium mb-1">Weight</p>
          {lastWeight ? (
            <div className="flex items-end gap-1.5">
              <span className="text-2xl font-bold">{lastWeight.weight}</span>
              <span className="text-xs text-slate-400 mb-1">kg</span>
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
            <p className="text-sm text-slate-500">Not logged yet</p>
          )}
        </div>

        {/* Water */}
        <WaterTracker />

        {/* Calories */}
        <div className="bg-slate-800 rounded-2xl p-4">
          <p className="text-xs text-slate-400 font-medium mb-1">Calories</p>
          <div className="flex items-end gap-1.5">
            <span className="text-2xl font-bold">{calories}</span>
            <span className="text-xs text-slate-400 mb-1">
              / {settings.calorieTarget}
            </span>
          </div>
          <div className="mt-2 h-1.5 bg-slate-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-teal-500 rounded-full transition-all duration-500"
              style={{
                width: `${Math.min(
                  (calories / settings.calorieTarget) * 100,
                  100
                )}%`,
              }}
            />
          </div>
        </div>

        {/* Last Workout */}
        <div className="bg-slate-800 rounded-2xl p-4">
          <p className="text-xs text-slate-400 font-medium mb-1">Last Workout</p>
          {lastWorkout ? (
            <>
              <p className="text-sm font-semibold truncate">{lastWorkout.name}</p>
              <p className="text-xs text-slate-400">
                {lastWorkoutDays === 0
                  ? "Today"
                  : lastWorkoutDays === 1
                  ? "Yesterday"
                  : `${lastWorkoutDays} days ago`}
              </p>
              <p className="text-xs text-slate-500 mt-0.5">
                {lastWorkout.exercises.length} exercise
                {lastWorkout.exercises.length !== 1 && "s"} · {lastWorkout.duration}m
              </p>
            </>
          ) : (
            <p className="text-sm text-slate-500">No workouts yet</p>
          )}
        </div>
      </div>

      {/* Workouts this week */}
      <div className="bg-slate-800 rounded-2xl px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-teal-600/20 rounded-lg">
            <Flame size={18} className="text-teal-400" />
          </div>
          <div>
            <p className="text-sm font-semibold">{workoutsThisWeek} workout{workoutsThisWeek !== 1 && "s"} this week</p>
            <p className="text-xs text-slate-400">Keep it up!</p>
          </div>
        </div>
        <Link
          href="/workouts"
          className="text-xs text-teal-400 hover:text-teal-300 font-medium transition"
        >
          View all
        </Link>
      </div>

      {/* Quick Actions */}
      <div className="flex gap-2">
        <Link
          href="/log"
          className="flex-1 flex items-center justify-center gap-1.5 bg-teal-600 hover:bg-teal-500 text-white py-2.5 rounded-xl text-sm font-medium transition active:scale-[0.98]"
        >
          <Scale size={16} /> Log Weight
        </Link>
        <Link
          href="/log"
          className="flex-1 flex items-center justify-center gap-1.5 bg-slate-700 hover:bg-slate-600 text-white py-2.5 rounded-xl text-sm font-medium transition active:scale-[0.98]"
        >
          <Utensils size={16} /> Log Meal
        </Link>
        <Link
          href="/workouts"
          className="flex-1 flex items-center justify-center gap-1.5 bg-slate-700 hover:bg-slate-600 text-white py-2.5 rounded-xl text-sm font-medium transition active:scale-[0.98]"
        >
          <Dumbbell size={16} /> Workout
        </Link>
      </div>

      {/* Weight Chart */}
      <WeightChart />
    </div>
  );
}
