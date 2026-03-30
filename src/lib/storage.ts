const PROFILE_ID = "default";

export interface MetricEntry {
  id: string;
  date: string;
  weight: number;
  bodyFat?: number;
  notes?: string;
}

export interface WaterEntry {
  date: string;
  glasses: number;
}

export interface CalorieEntry {
  date: string;
  calories: number;
}

export interface WorkoutEntry {
  id: string;
  date: string;
  name: string;
  duration: number;
  exercises: string[];
}

export interface UserSettings {
  waterGoal: number;
  calorieTarget: number;
  name: string;
}

function key(name: string): string {
  return `${name}_${PROFILE_ID}`;
}

function getItem<T>(name: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key(name));
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function setItem<T>(name: string, value: T): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(key(name), JSON.stringify(value));
}

// Metrics
export function getMetrics(): MetricEntry[] {
  return getItem<MetricEntry[]>("metrics", []);
}

export function saveMetric(entry: Omit<MetricEntry, "id">): MetricEntry {
  const metrics = getMetrics();
  const newEntry: MetricEntry = { ...entry, id: crypto.randomUUID() };
  metrics.push(newEntry);
  metrics.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  setItem("metrics", metrics);
  return newEntry;
}

export function deleteMetric(id: string): void {
  const metrics = getMetrics().filter((m) => m.id !== id);
  setItem("metrics", metrics);
}

// Water
export function getWater(date: string): number {
  return getItem<WaterEntry[]>("water", []).find((w) => w.date === date)?.glasses ?? 0;
}

export function setWater(date: string, glasses: number): void {
  const entries = getItem<WaterEntry[]>("water", []);
  const idx = entries.findIndex((w) => w.date === date);
  if (idx >= 0) {
    entries[idx].glasses = glasses;
  } else {
    entries.push({ date, glasses });
  }
  setItem("water", entries);
}

// Calories
export function getCalories(date: string): number {
  return getItem<CalorieEntry[]>("calories", []).find((c) => c.date === date)?.calories ?? 0;
}

export function setCalories(date: string, calories: number): void {
  const entries = getItem<CalorieEntry[]>("calories", []);
  const idx = entries.findIndex((c) => c.date === date);
  if (idx >= 0) {
    entries[idx].calories = calories;
  } else {
    entries.push({ date, calories });
  }
  setItem("calories", entries);
}

// Workouts
export function getWorkouts(): WorkoutEntry[] {
  return getItem<WorkoutEntry[]>("workouts", []);
}

export function saveWorkout(entry: Omit<WorkoutEntry, "id">): WorkoutEntry {
  const workouts = getWorkouts();
  const newEntry: WorkoutEntry = { ...entry, id: crypto.randomUUID() };
  workouts.push(newEntry);
  workouts.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  setItem("workouts", workouts);
  return newEntry;
}

export function deleteWorkout(id: string): void {
  const workouts = getWorkouts().filter((w) => w.id !== id);
  setItem("workouts", workouts);
}

// Settings
export function getSettings(): UserSettings {
  return getItem<UserSettings>("settings", {
    waterGoal: 8,
    calorieTarget: 2000,
    name: "User",
  });
}

export function saveSettings(settings: UserSettings): void {
  setItem("settings", settings);
}
