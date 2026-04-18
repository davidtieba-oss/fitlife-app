// --- Profile System ---
export const PROFILE_COLORS = ["#0d9488", "#8b5cf6", "#f59e0b", "#ec4899", "#06b6d4", "#22c55e"];

export interface Profile {
  id: string;
  name: string;
  color: string;
  createdAt: string;
}

let activeProfileId = "default";

function globalGet<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function globalSet<T>(key: string, value: T): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(key, JSON.stringify(value));
}

export function getProfiles(): Profile[] {
  return globalGet<Profile[]>("fitlife_profiles", []);
}

export function saveProfile(entry: Omit<Profile, "id" | "createdAt">): Profile {
  const profiles = getProfiles();
  const newProfile: Profile = {
    ...entry,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
  };
  profiles.push(newProfile);
  globalSet("fitlife_profiles", profiles);
  return newProfile;
}

export function updateProfile(id: string, updates: Partial<Pick<Profile, "name" | "color">>): void {
  const profiles = getProfiles().map((p) =>
    p.id === id ? { ...p, ...updates } : p
  );
  globalSet("fitlife_profiles", profiles);
}

export function deleteProfile(id: string): void {
  // Remove all profile-scoped data
  if (typeof window !== "undefined") {
    const suffix = `_${id}`;
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.endsWith(suffix)) keysToRemove.push(k);
    }
    keysToRemove.forEach((k) => localStorage.removeItem(k));
  }
  const profiles = getProfiles().filter((p) => p.id !== id);
  globalSet("fitlife_profiles", profiles);
}

export function getActiveProfileId(): string {
  if (typeof window === "undefined") return "default";
  const stored = localStorage.getItem("fitlife_active_profile");
  if (stored) {
    const profiles = getProfiles();
    if (profiles.some((p) => p.id === stored)) return stored;
  }
  const profiles = getProfiles();
  return profiles[0]?.id ?? "default";
}

export function setActiveProfileId(id: string): void {
  activeProfileId = id;
  if (typeof window !== "undefined") {
    localStorage.setItem("fitlife_active_profile", id);
  }
}

export function initProfiles(): string {
  const profiles = getProfiles();
  if (profiles.length === 0) {
    // Migrate: check if there's existing data under "default" profile
    // Don't auto-create here — onboarding will handle first profile creation
    // But if there's legacy data, create a default profile for it
    if (typeof window !== "undefined") {
      const hasLegacy = localStorage.getItem("settings_default");
      if (hasLegacy) {
        const legacySettings = JSON.parse(hasLegacy) as Partial<UserSettings>;
        const profile = saveProfile({
          name: legacySettings.name || "User",
          color: PROFILE_COLORS[0],
        });
        // Re-key legacy data from _default to _<newId>
        const suffix = "_default";
        const remap: [string, string][] = [];
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          if (k && k.endsWith(suffix) && !k.startsWith("fitlife_")) {
            const base = k.slice(0, -suffix.length);
            remap.push([k, `${base}_${profile.id}`]);
          }
        }
        for (const [oldKey, newKey] of remap) {
          const val = localStorage.getItem(oldKey);
          if (val) localStorage.setItem(newKey, val);
          localStorage.removeItem(oldKey);
        }
        setActiveProfileId(profile.id);
        return profile.id;
      }
    }
    return ""; // No profiles — onboarding needed
  }
  const id = getActiveProfileId();
  activeProfileId = id;
  return id;
}

// --- Core Storage Helpers ---
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
  return `${name}_${activeProfileId}`;
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

// Calories (legacy)
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
    const k = m.foodName.toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
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

// Body Measurements
export interface MeasurementEntry {
  id: string;
  date: string;
  neck?: number;
  chest?: number;
  waist?: number;
  hips?: number;
  leftBicep?: number;
  rightBicep?: number;
  leftThigh?: number;
  rightThigh?: number;
  calves?: number;
}

export function getMeasurements(): MeasurementEntry[] {
  return getItem<MeasurementEntry[]>("measurements", []);
}

export function saveMeasurement(entry: MeasurementEntry): void {
  const measurements = getMeasurements();
  measurements.unshift(entry);
  measurements.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  setItem("measurements", measurements);
}

export function deleteMeasurement(id: string): void {
  const measurements = getMeasurements().filter((m) => m.id !== id);
  setItem("measurements", measurements);
}

// Progress Photos
export interface ProgressPhoto {
  id: string;
  date: string;
  dataUrl: string;
  label?: string;
  pose?: "front" | "side" | "back";
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

// --- Grocery List (shared, not profile-scoped) ---
export const GROCERY_CATEGORIES = ["Produce", "Dairy", "Meat", "Pantry", "Beverages", "Other"] as const;

export interface GroceryItem {
  id: string;
  name: string;
  category: string;
  checked: boolean;
}

export function getGroceryList(): GroceryItem[] {
  return globalGet<GroceryItem[]>("fitlife_grocery", []);
}

export function saveGroceryItem(entry: Omit<GroceryItem, "id">): GroceryItem {
  const items = getGroceryList();
  const newItem: GroceryItem = { ...entry, id: crypto.randomUUID() };
  items.push(newItem);
  globalSet("fitlife_grocery", items);
  return newItem;
}

export function toggleGroceryItem(id: string): void {
  const items = getGroceryList().map((item) =>
    item.id === id ? { ...item, checked: !item.checked } : item
  );
  globalSet("fitlife_grocery", items);
}

export function deleteGroceryItem(id: string): void {
  const items = getGroceryList().filter((item) => item.id !== id);
  globalSet("fitlife_grocery", items);
}

export function clearCheckedGrocery(): void {
  const items = getGroceryList().filter((item) => !item.checked);
  globalSet("fitlife_grocery", items);
}

// --- AI Settings (global, shared across profiles) ---
export interface AiSettings {
  apiKey: string;
  model: string;
}

export interface AiModelInfo {
  id: string;
  name: string;
  desc: string;
  costNote: string;
}

export const AI_MODELS_FALLBACK: AiModelInfo[] = [
  { id: "claude-haiku-4-5-20251001", name: "Haiku 4.5", desc: "Fastest & cheapest", costNote: "~$0.001/request" },
  { id: "claude-sonnet-4-6", name: "Sonnet 4.6", desc: "Fast & smart — recommended", costNote: "~$0.01/request" },
  { id: "claude-opus-4-6", name: "Opus 4.6", desc: "Most capable", costNote: "~$0.05/request" },
];

const DEFAULT_AI_SETTINGS: AiSettings = { apiKey: "", model: "claude-sonnet-4-6" };

export function getAiSettings(): AiSettings {
  return { ...DEFAULT_AI_SETTINGS, ...globalGet<Partial<AiSettings>>("fitlife_ai_settings", {}) };
}

export function saveAiSettings(settings: AiSettings): void {
  globalSet("fitlife_ai_settings", settings);
}

// --- Cached Model List ---
interface CachedModels {
  models: AiModelInfo[];
  fetchedAt: number;
}

const MODEL_CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

export function getCachedModels(): AiModelInfo[] | null {
  const cached = globalGet<CachedModels | null>("fitlife_models_cache_v2", null);
  if (!cached) return null;
  if (Date.now() - cached.fetchedAt > MODEL_CACHE_TTL) return null;
  return cached.models;
}

export function saveCachedModels(models: AiModelInfo[]): void {
  globalSet<CachedModels>("fitlife_models_cache_v2", { models, fetchedAt: Date.now() });
}

// --- Coach Chat History (profile-scoped) ---
export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

export function getChatHistory(): ChatMessage[] {
  return getItem<ChatMessage[]>("coach_chat", []);
}

export function saveChatHistory(messages: ChatMessage[]): void {
  setItem("coach_chat", messages);
}

export function clearChatHistory(): void {
  setItem("coach_chat", []);
}

// --- Training Plans ---
export interface PlanExercise {
  name: string;
  sets: number;
  reps: string;
  rest_seconds: number;
  notes?: string;
}

export interface PlanDay {
  day: string;
  workout_name: string;
  exercises: PlanExercise[];
}

export interface TrainingPlan {
  id: string;
  plan_name: string;
  description: string;
  days: PlanDay[];
  rest_days: string[];
  progression_notes: string;
  createdAt: string;
  isActive: boolean;
}

export function getTrainingPlans(): TrainingPlan[] {
  return getItem<TrainingPlan[]>("training_plans", []);
}

export function saveTrainingPlan(plan: Omit<TrainingPlan, "id" | "createdAt">): TrainingPlan {
  const plans = getTrainingPlans();
  const newPlan: TrainingPlan = {
    ...plan,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
  };
  // If this plan is active, deactivate others
  if (newPlan.isActive) {
    for (const p of plans) p.isActive = false;
  }
  plans.unshift(newPlan);
  setItem("training_plans", plans);
  return newPlan;
}

export function deleteTrainingPlan(id: string): void {
  const plans = getTrainingPlans().filter((p) => p.id !== id);
  setItem("training_plans", plans);
}

export function setActivePlan(id: string): void {
  const plans = getTrainingPlans().map((p) => ({
    ...p,
    isActive: p.id === id,
  }));
  setItem("training_plans", plans);
}

export function getActivePlan(): TrainingPlan | null {
  return getTrainingPlans().find((p) => p.isActive) ?? null;
}

export function getPlannedWorkoutForDay(dayName: string): PlanDay | null {
  const plan = getActivePlan();
  if (!plan) return null;
  return plan.days.find((d) => d.day.toLowerCase() === dayName.toLowerCase()) ?? null;
}

// --- Meal Plans ---
export interface MealPlanMeal {
  type: string;
  name: string;
  description: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  ingredients: string[];
}

export interface MealPlanDay {
  day: string;
  meals: MealPlanMeal[];
}

export interface MealPlanGroceryItem {
  item: string;
  quantity: string;
  category: string;
}

export interface MealPlan {
  id: string;
  createdAt: string;
  preferences: {
    diet: string;
    mealsPerDay: number;
    days: number;
    allergies: string;
    cuisine: string;
  };
  days: MealPlanDay[];
  grocery_list: MealPlanGroceryItem[];
}

export function getMealPlans(): MealPlan[] {
  return getItem<MealPlan[]>("meal_plans", []);
}

export function saveMealPlan(plan: Omit<MealPlan, "id" | "createdAt">): MealPlan {
  const plans = getMealPlans();
  const newPlan: MealPlan = {
    ...plan,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
  };
  plans.unshift(newPlan);
  setItem("meal_plans", plans);
  return newPlan;
}

export function updateMealPlanDay(planId: string, dayIndex: number, newDay: MealPlanDay): void {
  const plans = getMealPlans().map((p) => {
    if (p.id !== planId) return p;
    const days = [...p.days];
    days[dayIndex] = newDay;
    return { ...p, days };
  });
  setItem("meal_plans", plans);
}

export function deleteMealPlan(id: string): void {
  const plans = getMealPlans().filter((p) => p.id !== id);
  setItem("meal_plans", plans);
}

// --- Data Management ---
const PROFILE_DATA_KEYS = [
  "metrics", "water", "calories", "meals", "workouts", "templates", "settings", "progress_photos", "coach_chat", "measurements", "training_plans", "meal_plans",
];

export function exportProfileData(): string {
  const data: Record<string, unknown> = {};
  for (const name of PROFILE_DATA_KEYS) {
    const raw = typeof window !== "undefined" ? localStorage.getItem(key(name)) : null;
    if (raw) data[name] = JSON.parse(raw);
  }
  return JSON.stringify(data, null, 2);
}

export function importProfileData(json: string): boolean {
  try {
    const data = JSON.parse(json) as Record<string, unknown>;
    for (const name of PROFILE_DATA_KEYS) {
      if (data[name] !== undefined) {
        if (typeof window !== "undefined") {
          localStorage.setItem(key(name), JSON.stringify(data[name]));
        }
      }
    }
    return true;
  } catch {
    return false;
  }
}

export function clearProfileData(): void {
  if (typeof window === "undefined") return;
  for (const name of PROFILE_DATA_KEYS) {
    localStorage.removeItem(key(name));
  }
}
