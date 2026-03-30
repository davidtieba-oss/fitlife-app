"use client";

import { useEffect, useState } from "react";
import {
  getMetrics,
  getWorkouts,
  getMeals,
  getSettings,
  type MetricEntry,
  type WorkoutEntry,
  type MealEntry,
  type UserSettings,
} from "@/lib/storage";
import WeightTab from "@/components/progress/WeightTab";
import WorkoutsTab from "@/components/progress/WorkoutsTab";
import NutritionTab from "@/components/progress/NutritionTab";
import PhotosTab from "@/components/progress/PhotosTab";

type Tab = "weight" | "workouts" | "nutrition" | "photos";

const TABS: { value: Tab; label: string }[] = [
  { value: "weight", label: "Weight" },
  { value: "workouts", label: "Workouts" },
  { value: "nutrition", label: "Nutrition" },
  { value: "photos", label: "Photos" },
];

export default function ProgressPage() {
  const [mounted, setMounted] = useState(false);
  const [tab, setTab] = useState<Tab>("weight");
  const [metrics, setMetrics] = useState<MetricEntry[]>([]);
  const [workouts, setWorkouts] = useState<WorkoutEntry[]>([]);
  const [meals, setMeals] = useState<MealEntry[]>([]);
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [weightPeriod, setWeightPeriod] = useState(30);

  useEffect(() => {
    setMounted(true);
    setMetrics(getMetrics());
    setWorkouts(getWorkouts());
    setMeals(getMeals());
    setSettings(getSettings());
  }, []);

  if (!mounted || !settings) {
    return (
      <div className="h-screen flex items-center justify-center text-slate-500">
        Loading...
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Progress</h1>

      {/* Tab bar */}
      <div className="flex bg-slate-800 rounded-xl p-1">
        {TABS.map((t) => (
          <button
            key={t.value}
            onClick={() => setTab(t.value)}
            className={`flex-1 py-2 rounded-lg text-xs font-medium transition ${
              tab === t.value
                ? "bg-teal-600 text-white"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "weight" && (
        <WeightTab
          metrics={metrics}
          period={weightPeriod}
          onPeriodChange={setWeightPeriod}
        />
      )}

      {tab === "workouts" && <WorkoutsTab workouts={workouts} />}

      {tab === "nutrition" && (
        <NutritionTab
          meals={meals}
          settings={settings}
          onMealsChange={setMeals}
        />
      )}

      {tab === "photos" && <PhotosTab />}
    </div>
  );
}
