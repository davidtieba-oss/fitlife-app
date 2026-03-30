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

export type MealType = "Breakfast" | "Lunch" | "Dinner" | "Snack";

export interface MealEntry {
  id: string;
  date: string;
  mealType: MealType;
  foodName: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface DailyMacros {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface WorkoutSet {
  reps: number;
  weight: number;
  completed: boolean;
}

export interface WorkoutExercise {
  exerciseId: string;
  name: string;
  sets: WorkoutSet[];
}

export interface WorkoutEntry {
  id: string;
  date: string;
  name: string;
  duration: number;
  exercises: WorkoutExercise[];
}

export interface WorkoutTemplate {
  id: string;
  name: string;
  exerciseIds: string[];
  isBuiltIn: boolean;
}

export type WeightGoal = "lose" | "maintain" | "gain";

export interface UserSettings {
  waterGoal: number;
  calorieTarget: number;
  name: string;
  proteinPct: number;
  carbsPct: number;
  fatPct: number;
  weightGoal: WeightGoal;
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

// Calories (legacy — kept for backward compat, but meals now drive calorie data)
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

// Meals
export function getMeals(): MealEntry[] {
  return getItem<MealEntry[]>("meals", []);
}

export function getMealsByDate(date: string): MealEntry[] {
  return getMeals().filter((m) => m.date === date);
}

export function getDailyMacros(date: string): DailyMacros {
  const meals = getMealsByDate(date);
  return meals.reduce(
    (acc, m) => ({
      calories: acc.calories + m.calories,
      protein: acc.protein + m.protein,
      carbs: acc.carbs + m.carbs,
      fat: acc.fat + m.fat,
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  );
}

export function saveMeal(entry: Omit<MealEntry, "id">): MealEntry {
  const meals = getMeals();
  const newEntry: MealEntry = { ...entry, id: crypto.randomUUID() };
  meals.push(newEntry);
  meals.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  setItem("meals", meals);
  return newEntry;
}

export function deleteMeal(id: string): void {
  const meals = getMeals().filter((m) => m.id !== id);
  setItem("meals", meals);
}

export function getRecentFoods(limit: number = 10): Omit<MealEntry, "id" | "date">[] {
  const meals = getMeals();
  const seen = new Set<string>();
  const result: Omit<MealEntry, "id" | "date">[] = [];
  for (const m of meals) {
    const key = m.foodName.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push({
      mealType: m.mealType,
      foodName: m.foodName,
      calories: m.calories,
      protein: m.protein,
      carbs: m.carbs,
      fat: m.fat,
    });
    if (result.length >= limit) break;
  }
  return result;
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

export function getWorkoutVolume(workout: WorkoutEntry): number {
  return workout.exercises.reduce(
    (total, ex) =>
      total +
      ex.sets.reduce(
        (exTotal, set) => exTotal + (set.completed ? set.reps * set.weight : 0),
        0
      ),
    0
  );
}

// Templates
const BUILT_IN_TEMPLATES: WorkoutTemplate[] = [
  {
    id: "tpl-push",
    name: "Push",
    exerciseIds: ["bench-press", "incline-bench", "ohp", "lateral-raise", "tricep-pushdown", "dips"],
    isBuiltIn: true,
  },
  {
    id: "tpl-pull",
    name: "Pull",
    exerciseIds: ["deadlift", "barbell-row", "lat-pulldown", "face-pulls", "barbell-curl", "hammer-curl"],
    isBuiltIn: true,
  },
  {
    id: "tpl-legs",
    name: "Legs",
    exerciseIds: ["squat", "romanian-deadlift", "leg-press", "leg-curl", "leg-extension", "calf-raise"],
    isBuiltIn: true,
  },
  {
    id: "tpl-upper",
    name: "Upper Body",
    exerciseIds: ["bench-press", "barbell-row", "ohp", "lat-pulldown", "db-curl", "tricep-pushdown"],
    isBuiltIn: true,
  },
  {
    id: "tpl-lower",
    name: "Lower Body",
    exerciseIds: ["squat", "romanian-deadlift", "bulgarian-split", "leg-curl", "calf-raise", "lunges"],
    isBuiltIn: true,
  },
  {
    id: "tpl-full",
    name: "Full Body",
    exerciseIds: ["squat", "bench-press", "barbell-row", "ohp", "deadlift", "plank"],
    isBuiltIn: true,
  },
];

export function getTemplates(): WorkoutTemplate[] {
  const custom = getItem<WorkoutTemplate[]>("templates", []);
  return [...BUILT_IN_TEMPLATES, ...custom];
}

export function saveTemplate(template: Omit<WorkoutTemplate, "id" | "isBuiltIn">): WorkoutTemplate {
  const templates = getItem<WorkoutTemplate[]>("templates", []);
  const newTemplate: WorkoutTemplate = {
    ...template,
    id: crypto.randomUUID(),
    isBuiltIn: false,
  };
  templates.push(newTemplate);
  setItem("templates", templates);
  return newTemplate;
}

export function deleteTemplate(id: string): void {
  const templates = getItem<WorkoutTemplate[]>("templates", []).filter((t) => t.id !== id);
  setItem("templates", templates);
}

// Settings
const DEFAULT_SETTINGS: UserSettings = {
  waterGoal: 8,
  calorieTarget: 2000,
  name: "User",
  proteinPct: 30,
  carbsPct: 40,
  fatPct: 30,
  weightGoal: "maintain",
};

export function getSettings(): UserSettings {
  return { ...DEFAULT_SETTINGS, ...getItem<Partial<UserSettings>>("settings", {}) };
}

export function saveSettings(settings: UserSettings): void {
  setItem("settings", settings);
}

export function getMacroTargets(settings: UserSettings): { protein: number; carbs: number; fat: number } {
  const cals = settings.calorieTarget;
  return {
    protein: Math.round((cals * settings.proteinPct) / 100 / 4),
    carbs: Math.round((cals * settings.carbsPct) / 100 / 4),
    fat: Math.round((cals * settings.fatPct) / 100 / 9),
  };
}

export function getSuggestedCalories(base: number, goal: WeightGoal): number {
  if (goal === "lose") return base - 300;
  if (goal === "gain") return base + 300;
  return base;
}

// Progress Photos
export interface ProgressPhoto {
  id: string;
  date: string;
  dataUrl: string;
  label?: string;
}

export function getProgressPhotos(): ProgressPhoto[] {
  return getItem<ProgressPhoto[]>("progress_photos", []);
}

export function saveProgressPhoto(entry: Omit<ProgressPhoto, "id">): ProgressPhoto | null {
  try {
    const photos = getProgressPhotos();
    const newPhoto: ProgressPhoto = { ...entry, id: crypto.randomUUID() };
    photos.push(newPhoto);
    photos.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    setItem("progress_photos", photos);
    return newPhoto;
  } catch {
    return null;
  }
}

export function deleteProgressPhoto(id: string): void {
  const photos = getProgressPhotos().filter((p) => p.id !== id);
  setItem("progress_photos", photos);
}

export function getPhotoStorageSize(): number {
  if (typeof window === "undefined") return 0;
  const raw = localStorage.getItem(key("progress_photos"));
  return raw ? raw.length * 2 : 0;
}
