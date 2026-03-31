"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { format, parseISO } from "date-fns";
import {
  Trash2,
  TrendingUp,
  TrendingDown,
  Clock,
  Sparkles,
  Camera,
  Loader2,
  Check,
  Pencil,
  X,
  Ruler,
  Search,
} from "lucide-react";
import { askAI } from "@/lib/ai";
import {
  getMetrics,
  saveMetric,
  deleteMetric,
  getMealsByDate,
  saveMeal,
  deleteMeal,
  getRecentFoods,
  getDailyMacros,
  getSettings,
  getMacroTargets,
  getMeasurements,
  saveMeasurement,
  deleteMeasurement,
  type MetricEntry,
  type MealEntry,
  type MealType,
  type MeasurementEntry,
} from "@/lib/storage";
import Toast from "@/components/Toast";
import { ListSkeleton } from "@/components/Skeleton";

type Tab = "metrics" | "meals" | "measurements";
type AiMode = "idle" | "text" | "photo" | "loading" | "preview";
const MEAL_TYPES: MealType[] = ["Breakfast", "Lunch", "Dinner", "Snack"];

interface AiFoodItem {
  name: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
}

interface AiEstimate {
  foods: AiFoodItem[];
  total: {
    calories: number;
    protein_g: number;
    carbs_g: number;
    fat_g: number;
  };
  portion_note: string;
}

export default function LogPage() {
  const [mounted, setMounted] = useState(false);
  const [tab, setTab] = useState<Tab>("metrics");
  const [toast, setToast] = useState("");

  // Body metrics state
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [weight, setWeight] = useState("");
  const [bodyFat, setBodyFat] = useState("");
  const [notes, setNotes] = useState("");
  const [metrics, setMetrics] = useState<MetricEntry[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Meal state
  const [mealDate, setMealDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [mealType, setMealType] = useState<MealType>("Breakfast");
  const [foodName, setFoodName] = useState("");
  const [mealCals, setMealCals] = useState("");
  const [protein, setProtein] = useState("");
  const [carbs, setCarbs] = useState("");
  const [fat, setFat] = useState("");
  const [todayMeals, setTodayMeals] = useState<MealEntry[]>([]);

  // AI meal estimation state
  const [aiMode, setAiMode] = useState<AiMode>("idle");
  const [aiDescription, setAiDescription] = useState("");
  const [aiResult, setAiResult] = useState<AiEstimate | null>(null);
  const [aiError, setAiError] = useState("");
  const photoInputRef = useRef<HTMLInputElement>(null);

  // Search & filter state
  const [mealSearch, setMealSearch] = useState("");
  const [mealDateFrom, setMealDateFrom] = useState("");
  const [mealDateTo, setMealDateTo] = useState("");
  const [measDateFrom, setMeasDateFrom] = useState("");
  const [measDateTo, setMeasDateTo] = useState("");

  // Measurements state
  const [measureDate, setMeasureDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [measurements, setMeasurementsState] = useState<MeasurementEntry[]>([]);
  const [measureFields, setMeasureFields] = useState<Record<string, string>>({});

  const refreshMetrics = useCallback(() => setMetrics(getMetrics()), []);
  const refreshMeals = useCallback(
    () => setTodayMeals(getMealsByDate(mealDate)),
    [mealDate]
  );
  const refreshMeasurements = useCallback(() => setMeasurementsState(getMeasurements()), []);

  useEffect(() => {
    setMounted(true);
    refreshMetrics();
    refreshMeals();
    refreshMeasurements();
  }, [refreshMetrics, refreshMeals, refreshMeasurements]);

  useEffect(() => {
    if (mounted) refreshMeals();
  }, [mealDate, mounted, refreshMeals]);

  if (!mounted) {
    return <ListSkeleton />;
  }

  // Quick macro estimate: given calories and protein, split remaining between carbs and fat
  function autoEstimateMacros(calsStr: string, proteinStr: string) {
    const c = parseFloat(calsStr);
    const p = parseFloat(proteinStr);
    if (!c || c <= 0) return;
    if (p && p > 0) {
      const remaining = Math.max(0, c - p * 4);
      const estCarbs = Math.round((remaining * 0.55) / 4);
      const estFat = Math.round((remaining * 0.45) / 9);
      setCarbs(String(estCarbs));
      setFat(String(estFat));
    }
  }

  // Metric validation
  function validateMetric(): boolean {
    const errs: Record<string, string> = {};
    const w = parseFloat(weight);
    if (!weight || isNaN(w)) errs.weight = "Required";
    else if (w < 30 || w > 300) errs.weight = "Must be 30-300 kg";
    if (bodyFat) {
      const bf = parseFloat(bodyFat);
      if (isNaN(bf) || bf < 3 || bf > 60) errs.bodyFat = "Must be 3-60%";
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  function handleMetricSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validateMetric()) return;
    saveMetric({
      date,
      weight: parseFloat(weight),
      bodyFat: bodyFat ? parseFloat(bodyFat) : undefined,
      notes: notes || undefined,
    });
    setWeight("");
    setBodyFat("");
    setNotes("");
    setToast("Entry saved!");
    refreshMetrics();
  }

  function handleMealSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!foodName.trim() || !mealCals) return;
    saveMeal({
      date: mealDate,
      mealType,
      foodName: foodName.trim(),
      calories: parseInt(mealCals) || 0,
      protein: parseInt(protein) || 0,
      carbs: parseInt(carbs) || 0,
      fat: parseInt(fat) || 0,
    });
    setFoodName("");
    setMealCals("");
    setProtein("");
    setCarbs("");
    setFat("");
    setToast("Meal logged!");
    refreshMeals();
  }

  function handleQuickAdd(food: Omit<MealEntry, "id" | "date">) {
    saveMeal({ ...food, date: mealDate });
    setToast(`${food.foodName} added!`);
    refreshMeals();
  }

  // --- AI Meal Estimation ---
  const MEAL_SYSTEM_PROMPT = `You are a nutrition estimation assistant. Given a food description or photo, estimate the nutritional content of each food item. Return ONLY valid JSON with this exact format, no other text:
{"foods":[{"name":"string","calories":number,"protein_g":number,"carbs_g":number,"fat_g":number}],"total":{"calories":number,"protein_g":number,"carbs_g":number,"fat_g":number},"portion_note":"string"}
Be realistic with portion sizes. If uncertain, provide your best estimate and note it in portion_note.`;

  async function handleAiEstimate(type: "text" | "image", content: string) {
    setAiMode("loading");
    setAiError("");
    try {
      const text = await askAI({
        system: MEAL_SYSTEM_PROMPT,
        userMessage:
          type === "text"
            ? `Estimate the nutritional content of this meal: ${content}`
            : "Look at this photo of food. Estimate the portion sizes and nutritional content. Return ONLY valid JSON with the format specified.",
        imageBase64: type === "image" ? content : undefined,
        maxTokens: 1024,
      });
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error("Could not parse nutrition data");
      setAiResult(JSON.parse(jsonMatch[0]) as AiEstimate);
      setAiMode("preview");
    } catch (err) {
      setAiError(err instanceof Error ? err.message : "Failed to estimate meal");
      setAiMode("idle");
    }
  }

  function handleAiTextSubmit() {
    const trimmed = aiDescription.trim();
    if (!trimmed) return;
    handleAiEstimate("text", trimmed);
  }

  function handlePhotoSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) {
      setAiMode("idle");
      return;
    }
    // Resize and convert to base64
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const maxSize = 1024;
        let w = img.width;
        let h = img.height;
        if (w > maxSize || h > maxSize) {
          if (w > h) {
            h = Math.round((h * maxSize) / w);
            w = maxSize;
          } else {
            w = Math.round((w * maxSize) / h);
            h = maxSize;
          }
        }
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        ctx?.drawImage(img, 0, 0, w, h);
        const dataUrl = canvas.toDataURL("image/jpeg", 0.8);
        handleAiEstimate("image", dataUrl);
      };
      img.src = ev.target?.result as string;
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  }

  function handleAiAccept() {
    if (!aiResult) return;
    for (const food of aiResult.foods) {
      saveMeal({
        date: mealDate,
        mealType,
        foodName: food.name,
        calories: Math.round(food.calories),
        protein: Math.round(food.protein_g),
        carbs: Math.round(food.carbs_g),
        fat: Math.round(food.fat_g),
      });
    }
    setToast(`${aiResult.foods.length} item${aiResult.foods.length > 1 ? "s" : ""} logged!`);
    refreshMeals();
    resetAi();
  }

  function handleAiEdit() {
    if (!aiResult) return;
    // If single food, pre-fill with it; otherwise use total
    if (aiResult.foods.length === 1) {
      const f = aiResult.foods[0];
      setFoodName(f.name);
      setMealCals(String(Math.round(f.calories)));
      setProtein(String(Math.round(f.protein_g)));
      setCarbs(String(Math.round(f.carbs_g)));
      setFat(String(Math.round(f.fat_g)));
    } else {
      setFoodName(aiResult.foods.map((f) => f.name).join(", "));
      setMealCals(String(Math.round(aiResult.total.calories)));
      setProtein(String(Math.round(aiResult.total.protein_g)));
      setCarbs(String(Math.round(aiResult.total.carbs_g)));
      setFat(String(Math.round(aiResult.total.fat_g)));
    }
    resetAi();
  }

  function resetAi() {
    setAiMode("idle");
    setAiDescription("");
    setAiResult(null);
    setAiError("");
  }

  const dailyMacros = getDailyMacros(mealDate);
  const settings = getSettings();
  const macroTargets = getMacroTargets(settings);
  const recentFoods = getRecentFoods(10);

  // Group today's meals by type
  const mealsByType = MEAL_TYPES.map((type) => ({
    type,
    meals: todayMeals.filter((m) => m.mealType === type),
  })).filter((g) => g.meals.length > 0);

  return (
    <div className="space-y-4">
      {toast && <Toast message={toast} onClose={() => setToast("")} />}

      <h1 className="text-xl font-bold">Log</h1>

      {/* Tab switcher */}
      <div className="flex bg-gray-100 dark:bg-slate-800 rounded-xl p-1">
        {(["metrics", "meals", "measurements"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-2 rounded-lg text-xs font-medium transition ${
              tab === t ? "bg-teal-600 text-white" : "text-gray-500 dark:text-slate-400"
            }`}
          >
            {t === "metrics" ? "Body Metrics" : t === "meals" ? "Meals" : "Measurements"}
          </button>
        ))}
      </div>

      {/* === Body Metrics Tab === */}
      {tab === "metrics" && (
        <div className="space-y-4">
          <form
            onSubmit={handleMetricSubmit}
            className="bg-gray-100 dark:bg-slate-800 rounded-2xl p-4 space-y-4"
          >
            <div>
              <label className="text-xs text-gray-500 dark:text-slate-400 font-medium">Date</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full mt-1 bg-gray-200 dark:bg-slate-700 rounded-lg px-3 py-2.5 text-sm text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 dark:text-slate-400 font-medium">
                Weight (kg) *
              </label>
              <input
                type="number"
                step="0.1"
                inputMode="decimal"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                placeholder="72.5"
                className="w-full mt-1 bg-gray-200 dark:bg-slate-700 rounded-lg px-3 py-2.5 text-sm text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-teal-500"
              />
              {errors.weight && (
                <p className="text-xs text-red-400 mt-1">{errors.weight}</p>
              )}
            </div>
            <div>
              <label className="text-xs text-gray-500 dark:text-slate-400 font-medium">
                Body Fat % (optional)
              </label>
              <input
                type="number"
                step="0.1"
                inputMode="decimal"
                value={bodyFat}
                onChange={(e) => setBodyFat(e.target.value)}
                placeholder="18.5"
                className="w-full mt-1 bg-gray-200 dark:bg-slate-700 rounded-lg px-3 py-2.5 text-sm text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-teal-500"
              />
              {errors.bodyFat && (
                <p className="text-xs text-red-400 mt-1">{errors.bodyFat}</p>
              )}
            </div>
            <div>
              <label className="text-xs text-gray-500 dark:text-slate-400 font-medium">
                Notes (optional)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                placeholder="Feeling good today..."
                className="w-full mt-1 bg-gray-200 dark:bg-slate-700 rounded-lg px-3 py-2.5 text-sm text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-teal-500 resize-none"
              />
            </div>
            <button
              type="submit"
              className="w-full bg-teal-600 hover:bg-teal-500 text-white py-2.5 rounded-xl text-sm font-semibold transition active:scale-[0.98]"
            >
              Save Entry
            </button>
          </form>

          {/* Recent Entries */}
          <div>
            <h2 className="text-sm font-semibold text-gray-600 dark:text-slate-300 mb-2">
              Recent Entries
            </h2>
            {metrics.length === 0 ? (
              <p className="text-sm text-gray-400 dark:text-slate-500">No entries yet.</p>
            ) : (
              <div className="space-y-2">
                {metrics.slice(0, 10).map((m, i) => {
                  const prev = metrics[i + 1];
                  const diff = prev ? m.weight - prev.weight : 0;
                  return (
                    <div
                      key={m.id}
                      className="bg-gray-100 dark:bg-slate-800 rounded-xl px-4 py-3 flex items-center justify-between"
                    >
                      <div>
                        <p className="text-sm font-medium">
                          {format(parseISO(m.date), "MMM d, yyyy")}
                        </p>
                        <div className="flex items-center gap-3 mt-0.5">
                          <span className="text-xs text-gray-500 dark:text-slate-400">
                            {m.weight} kg
                          </span>
                          {m.bodyFat !== undefined && (
                            <span className="text-xs text-gray-500 dark:text-slate-400">
                              {m.bodyFat}% BF
                            </span>
                          )}
                          {diff !== 0 && (
                            <span
                              className={`flex items-center gap-0.5 text-xs ${
                                diff > 0 ? "text-red-400" : "text-green-400"
                              }`}
                            >
                              {diff > 0 ? (
                                <TrendingUp size={12} />
                              ) : (
                                <TrendingDown size={12} />
                              )}
                              {Math.abs(diff).toFixed(1)}
                            </span>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          deleteMetric(m.id);
                          refreshMetrics();
                        }}
                        className="text-gray-400 dark:text-slate-500 hover:text-red-400 p-1 transition"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* === Meals Tab === */}
      {tab === "meals" && (
        <div className="space-y-4">
          {/* Daily totals */}
          <div className="bg-gray-100 dark:bg-slate-800 rounded-2xl p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-gray-500 dark:text-slate-400 font-medium">Daily Totals</p>
              <input
                type="date"
                value={mealDate}
                onChange={(e) => setMealDate(e.target.value)}
                className="bg-gray-200 dark:bg-slate-700 rounded-lg px-2 py-1 text-xs text-gray-900 dark:text-white outline-none"
              />
            </div>
            <div className="flex items-end gap-1.5 mb-2">
              <span className="text-2xl font-bold">{dailyMacros.calories}</span>
              <span className="text-xs text-gray-500 dark:text-slate-400 mb-1">
                / {settings.calorieTarget} cal
              </span>
            </div>
            <div className="h-1.5 bg-gray-200 dark:bg-slate-700 rounded-full overflow-hidden mb-3">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  dailyMacros.calories > settings.calorieTarget
                    ? "bg-red-500"
                    : dailyMacros.calories > settings.calorieTarget * 0.85
                    ? "bg-yellow-500"
                    : "bg-teal-500"
                }`}
                style={{
                  width: `${Math.min(
                    (dailyMacros.calories / settings.calorieTarget) * 100,
                    100
                  )}%`,
                }}
              />
            </div>
            <div className="grid grid-cols-3 gap-2">
              <MacroMini
                label="Protein"
                value={dailyMacros.protein}
                target={macroTargets.protein}
                color="#0d9488"
              />
              <MacroMini
                label="Carbs"
                value={dailyMacros.carbs}
                target={macroTargets.carbs}
                color="#06b6d4"
              />
              <MacroMini
                label="Fat"
                value={dailyMacros.fat}
                target={macroTargets.fat}
                color="#f59e0b"
              />
            </div>
          </div>

          {/* AI Meal Estimation */}
          <AiMealSection
            aiMode={aiMode}
            aiDescription={aiDescription}
            aiResult={aiResult}
            aiError={aiError}
            photoInputRef={photoInputRef}
            onSetAiMode={setAiMode}
            onSetAiDescription={setAiDescription}
            onTextSubmit={handleAiTextSubmit}
            onPhotoSelect={handlePhotoSelect}
            onAccept={handleAiAccept}
            onEdit={handleAiEdit}
            onCancel={resetAi}
          />

          {/* Meal form */}
          <form
            onSubmit={handleMealSubmit}
            className="bg-gray-100 dark:bg-slate-800 rounded-2xl p-4 space-y-3"
          >
            {/* Meal type */}
            <div className="grid grid-cols-4 gap-1.5">
              {MEAL_TYPES.map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setMealType(type)}
                  className={`py-1.5 rounded-lg text-xs font-medium transition ${
                    mealType === type
                      ? "bg-teal-600 text-white"
                      : "bg-gray-200 dark:bg-slate-700 text-gray-500 dark:text-slate-400"
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
            <div>
              <label className="text-xs text-gray-500 dark:text-slate-400 font-medium">
                Food name *
              </label>
              <input
                type="text"
                value={foodName}
                onChange={(e) => setFoodName(e.target.value)}
                placeholder="Chicken breast"
                className="w-full mt-1 bg-gray-200 dark:bg-slate-700 rounded-lg px-3 py-2.5 text-sm text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-gray-500 dark:text-slate-400 font-medium">
                  Calories *
                </label>
                <input
                  type="number"
                  inputMode="numeric"
                  value={mealCals}
                  onChange={(e) => {
                    setMealCals(e.target.value);
                    autoEstimateMacros(e.target.value, protein);
                  }}
                  placeholder="350"
                  className="w-full mt-1 bg-gray-200 dark:bg-slate-700 rounded-lg px-3 py-2.5 text-sm text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 dark:text-slate-400 font-medium">
                  Protein (g)
                </label>
                <input
                  type="number"
                  inputMode="numeric"
                  value={protein}
                  onChange={(e) => {
                    setProtein(e.target.value);
                    autoEstimateMacros(mealCals, e.target.value);
                  }}
                  placeholder="30"
                  className="w-full mt-1 bg-gray-200 dark:bg-slate-700 rounded-lg px-3 py-2.5 text-sm text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 dark:text-slate-400 font-medium">
                  Carbs (g)
                </label>
                <input
                  type="number"
                  inputMode="numeric"
                  value={carbs}
                  onChange={(e) => setCarbs(e.target.value)}
                  placeholder="40"
                  className="w-full mt-1 bg-gray-200 dark:bg-slate-700 rounded-lg px-3 py-2.5 text-sm text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 dark:text-slate-400 font-medium">
                  Fat (g)
                </label>
                <input
                  type="number"
                  inputMode="numeric"
                  value={fat}
                  onChange={(e) => setFat(e.target.value)}
                  placeholder="12"
                  className="w-full mt-1 bg-gray-200 dark:bg-slate-700 rounded-lg px-3 py-2.5 text-sm text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>
            </div>
            <p className="text-[10px] text-gray-400 dark:text-slate-500">
              Enter calories + protein to auto-estimate carbs/fat
            </p>
            <button
              type="submit"
              disabled={!foodName.trim() || !mealCals}
              className="w-full bg-teal-600 hover:bg-teal-500 disabled:opacity-40 disabled:cursor-not-allowed text-white py-2.5 rounded-xl text-sm font-semibold transition active:scale-[0.98]"
            >
              Log Meal
            </button>
          </form>

          {/* Quick add */}
          {recentFoods.length > 0 && (
            <div>
              <div className="flex items-center gap-1.5 mb-2">
                <Clock size={13} className="text-gray-400 dark:text-slate-500" />
                <h2 className="text-sm font-semibold text-gray-600 dark:text-slate-300">
                  Quick Add
                </h2>
              </div>
              <div className="flex gap-2 overflow-x-auto pb-1">
                {recentFoods.map((food, i) => (
                  <button
                    key={i}
                    onClick={() => handleQuickAdd(food)}
                    className="shrink-0 bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 rounded-xl px-3 py-2 text-left transition"
                  >
                    <p className="text-xs font-medium text-gray-900 dark:text-white truncate max-w-[120px]">
                      {food.foodName}
                    </p>
                    <p className="text-[10px] text-gray-500 dark:text-slate-400">
                      {food.calories} cal · {food.protein}g P
                    </p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Today's meals by type */}
          <div className="space-y-2">
            <h2 className="text-sm font-semibold text-gray-600 dark:text-slate-300">
              {mealDate === format(new Date(), "yyyy-MM-dd")
                ? "Today's Meals"
                : format(parseISO(mealDate), "MMM d") + " Meals"}
            </h2>

            {/* Search & date filter */}
            <div className="space-y-2">
              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-slate-400" />
                <input
                  type="text"
                  value={mealSearch}
                  onChange={(e) => setMealSearch(e.target.value)}
                  placeholder="Search foods..."
                  className="w-full bg-gray-100 dark:bg-slate-800 rounded-xl pl-9 pr-4 py-2.5 text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-slate-500 outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>
              <div className="flex gap-2">
                <input type="date" value={mealDateFrom} onChange={(e) => setMealDateFrom(e.target.value)} className="flex-1 bg-gray-100 dark:bg-slate-800 rounded-xl px-3 py-2 text-xs text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-teal-500" />
                <input type="date" value={mealDateTo} onChange={(e) => setMealDateTo(e.target.value)} className="flex-1 bg-gray-100 dark:bg-slate-800 rounded-xl px-3 py-2 text-xs text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-teal-500" />
              </div>
            </div>

            {(() => {
              const filteredMeals = todayMeals.filter((m) => {
                if (mealSearch && !m.foodName.toLowerCase().includes(mealSearch.toLowerCase())) return false;
                if (mealDateFrom && m.date < mealDateFrom) return false;
                if (mealDateTo && m.date > mealDateTo) return false;
                return true;
              });
              const filteredMealsByType = MEAL_TYPES.map((type) => ({
                type,
                meals: filteredMeals.filter((m) => m.mealType === type),
              })).filter((g) => g.meals.length > 0);

              return (
                <>
                  {filteredMealsByType.length === 0 ? (
                    <p className="text-sm text-gray-400 dark:text-slate-500">No meals logged for this day.</p>
                  ) : (
                    filteredMealsByType.map(({ type, meals: typeMeals }) => (
                      <div key={type} className="bg-gray-100 dark:bg-slate-800 rounded-xl p-3">
                        <p className="text-xs text-teal-400 font-semibold mb-1.5">
                          {type}
                        </p>
                        <div className="space-y-1.5">
                          {typeMeals.map((m) => (
                            <div
                              key={m.id}
                              className="flex items-center justify-between"
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
                                onClick={() => {
                                  deleteMeal(m.id);
                                  refreshMeals();
                                }}
                                className="text-gray-400 dark:text-slate-500 hover:text-red-400 p-1 transition ml-2"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))
                  )}

                  {/* Daily totals row */}
                  {filteredMealsByType.length > 0 && (
                    <div className="bg-gray-200/50 dark:bg-slate-700/50 rounded-xl px-3 py-2 flex items-center justify-between">
                      <span className="text-xs text-gray-600 dark:text-slate-300 font-medium">
                        Day Total
                      </span>
                      <span className="text-xs text-gray-500 dark:text-slate-400">
                        {dailyMacros.calories} cal · P {dailyMacros.protein}g · C{" "}
                        {dailyMacros.carbs}g · F {dailyMacros.fat}g
                      </span>
                    </div>
                  )}
                </>
              );
            })()}
          </div>
        </div>
      )}

      {/* === Measurements Tab === */}
      {tab === "measurements" && (
        <MeasurementsSection
          date={measureDate}
          onDateChange={setMeasureDate}
          measurements={measurements}
          fields={measureFields}
          onFieldsChange={setMeasureFields}
          measDateFrom={measDateFrom}
          measDateTo={measDateTo}
          onMeasDateFromChange={setMeasDateFrom}
          onMeasDateToChange={setMeasDateTo}
          onSave={() => {
            const hasAny = MEASURE_FIELDS.some((f) => measureFields[f.key]?.trim());
            if (!hasAny) return;
            const entry: MeasurementEntry = {
              id: crypto.randomUUID(),
              date: measureDate,
            };
            for (const f of MEASURE_FIELDS) {
              const v = parseFloat(measureFields[f.key] || "");
              if (!isNaN(v) && v > 0) (entry as unknown as Record<string, unknown>)[f.key] = v;
            }
            saveMeasurement(entry);
            setMeasureFields({});
            setToast("Measurements saved!");
            refreshMeasurements();
          }}
          onDelete={(id) => {
            deleteMeasurement(id);
            refreshMeasurements();
          }}
          toast={toast}
        />
      )}
    </div>
  );
}

// --- Measurement Fields Config ---
const MEASURE_FIELDS = [
  { key: "neck", label: "Neck" },
  { key: "chest", label: "Chest" },
  { key: "waist", label: "Waist" },
  { key: "hips", label: "Hips" },
  { key: "leftBicep", label: "L Bicep" },
  { key: "rightBicep", label: "R Bicep" },
  { key: "leftThigh", label: "L Thigh" },
  { key: "rightThigh", label: "R Thigh" },
  { key: "calves", label: "Calves" },
] as const;

// --- Measurements Section Component ---
function MeasurementsSection({
  date,
  onDateChange,
  measurements,
  fields,
  onFieldsChange,
  measDateFrom,
  measDateTo,
  onMeasDateFromChange,
  onMeasDateToChange,
  onSave,
  onDelete,
}: {
  date: string;
  onDateChange: (d: string) => void;
  measurements: MeasurementEntry[];
  fields: Record<string, string>;
  onFieldsChange: (f: Record<string, string>) => void;
  measDateFrom: string;
  measDateTo: string;
  onMeasDateFromChange: (v: string) => void;
  onMeasDateToChange: (v: string) => void;
  onSave: () => void;
  onDelete: (id: string) => void;
  toast: string;
}) {
  const lastEntry = measurements[0];
  const todayEntry = measurements.find((m) => m.date === date);
  const prevEntry = todayEntry ? measurements.find((m) => m.date < date) : lastEntry;
  const currentEntry = todayEntry || lastEntry;

  return (
    <div className="space-y-4">
      {/* Form */}
      <div className="bg-gray-100 dark:bg-slate-800 rounded-2xl p-4 space-y-3">
        <div className="flex items-center gap-2 mb-1">
          <Ruler size={14} className="text-teal-400" />
          <p className="text-xs font-semibold text-gray-900 dark:text-white">Body Measurements (cm)</p>
        </div>

        <div>
          <label className="text-xs text-gray-500 dark:text-slate-400 font-medium">Date</label>
          <input
            type="date"
            value={date}
            onChange={(e) => onDateChange(e.target.value)}
            className="w-full mt-1 bg-gray-200 dark:bg-slate-700 rounded-lg px-3 py-2.5 text-sm text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-teal-500"
          />
        </div>

        <div className="grid grid-cols-3 gap-2">
          {MEASURE_FIELDS.map((f) => (
            <div key={f.key}>
              <label className="text-[10px] text-gray-500 dark:text-slate-400 font-medium">{f.label}</label>
              <input
                type="number"
                step="0.1"
                inputMode="decimal"
                value={fields[f.key] || ""}
                onChange={(e) => onFieldsChange({ ...fields, [f.key]: e.target.value })}
                placeholder={
                  lastEntry
                    ? String((lastEntry as unknown as Record<string, unknown>)[f.key] || "")
                    : ""
                }
                className="w-full mt-0.5 bg-gray-200 dark:bg-slate-700 rounded-lg px-2 py-2 text-xs text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
          ))}
        </div>

        <button
          onClick={onSave}
          disabled={!MEASURE_FIELDS.some((f) => fields[f.key]?.trim())}
          className="w-full bg-teal-600 hover:bg-teal-500 disabled:opacity-40 disabled:cursor-not-allowed text-white py-2.5 rounded-xl text-sm font-semibold transition active:scale-[0.98]"
        >
          Save Measurements
        </button>
      </div>

      {/* Comparison card */}
      {currentEntry && prevEntry && currentEntry.id !== prevEntry.id && (
        <div className="bg-gray-100 dark:bg-slate-800 rounded-2xl p-4">
          <p className="text-xs font-semibold text-gray-600 dark:text-slate-300 mb-2">Changes</p>
          <div className="grid grid-cols-3 gap-2">
            {MEASURE_FIELDS.map((f) => {
              const curr = (currentEntry as unknown as Record<string, unknown>)[f.key] as number | undefined;
              const prev = (prevEntry as unknown as Record<string, unknown>)[f.key] as number | undefined;
              if (!curr || !prev) return null;
              const diff = curr - prev;
              return (
                <div key={f.key} className="text-center">
                  <p className="text-[10px] text-gray-500 dark:text-slate-400">{f.label}</p>
                  <p className="text-xs font-medium text-gray-900 dark:text-white">{curr} cm</p>
                  {diff !== 0 && (
                    <p className={`text-[10px] flex items-center justify-center gap-0.5 ${diff > 0 ? "text-orange-400" : "text-green-400"}`}>
                      {diff > 0 ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                      {diff > 0 ? "+" : ""}{diff.toFixed(1)}
                    </p>
                  )}
                </div>
              );
            }).filter(Boolean)}
          </div>
        </div>
      )}

      {/* Recent entries */}
      <div>
        <h2 className="text-sm font-semibold text-gray-600 dark:text-slate-300 mb-2">Recent Measurements</h2>

        {/* Date range filter */}
        <div className="flex gap-2 mb-2">
          <input type="date" value={measDateFrom} onChange={(e) => onMeasDateFromChange(e.target.value)} className="flex-1 bg-gray-100 dark:bg-slate-800 rounded-xl px-3 py-2 text-xs text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-teal-500" />
          <input type="date" value={measDateTo} onChange={(e) => onMeasDateToChange(e.target.value)} className="flex-1 bg-gray-100 dark:bg-slate-800 rounded-xl px-3 py-2 text-xs text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-teal-500" />
        </div>

        {(() => {
          const filteredMeasurements = measurements.filter((m) => {
            if (measDateFrom && m.date < measDateFrom) return false;
            if (measDateTo && m.date > measDateTo) return false;
            return true;
          });
          return filteredMeasurements.length === 0 ? (
            <p className="text-sm text-gray-400 dark:text-slate-500">No measurements yet.</p>
          ) : (
            <div className="space-y-2">
              {filteredMeasurements.slice(0, 5).map((m) => {
                const fields_present = MEASURE_FIELDS.filter(
                  (f) => (m as unknown as Record<string, unknown>)[f.key] != null
                );
                return (
                  <div key={m.id} className="bg-gray-100 dark:bg-slate-800 rounded-xl px-4 py-3 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">{format(parseISO(m.date), "MMM d, yyyy")}</p>
                      <p className="text-[10px] text-gray-500 dark:text-slate-400 mt-0.5">
                        {fields_present.map((f) => `${f.label}: ${(m as unknown as Record<string, unknown>)[f.key]}cm`).join(" · ")}
                      </p>
                    </div>
                    <button
                      onClick={() => onDelete(m.id)}
                      className="text-gray-400 dark:text-slate-500 hover:text-red-400 p-1 transition"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                );
              })}
            </div>
          );
        })()}
      </div>
    </div>
  );
}

// --- AI Meal Section Component ---
function AiMealSection({
  aiMode,
  aiDescription,
  aiResult,
  aiError,
  photoInputRef,
  onSetAiMode,
  onSetAiDescription,
  onTextSubmit,
  onPhotoSelect,
  onAccept,
  onEdit,
  onCancel,
}: {
  aiMode: AiMode;
  aiDescription: string;
  aiResult: AiEstimate | null;
  aiError: string;
  photoInputRef: React.RefObject<HTMLInputElement | null>;
  onSetAiMode: (mode: AiMode) => void;
  onSetAiDescription: (desc: string) => void;
  onTextSubmit: () => void;
  onPhotoSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onAccept: () => void;
  onEdit: () => void;
  onCancel: () => void;
}) {
  // Error display
  if (aiError) {
    return (
      <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4">
        <p className="text-xs text-red-400 mb-2">{aiError}</p>
        <button
          onClick={onCancel}
          className="text-xs text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white transition"
        >
          Dismiss
        </button>
      </div>
    );
  }

  // Idle — show AI buttons
  if (aiMode === "idle") {
    return (
      <div className="space-y-2">
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => onSetAiMode("text")}
            className="flex items-center justify-center gap-2 bg-gradient-to-r from-violet-600/20 to-teal-600/20 hover:from-violet-600/30 hover:to-teal-600/30 border border-violet-500/20 rounded-xl py-3 transition"
          >
            <Sparkles size={16} className="text-violet-400" />
            <span className="text-xs font-medium text-gray-900 dark:text-white">Describe with AI</span>
          </button>
          <button
            onClick={() => {
              onSetAiMode("photo");
              setTimeout(() => photoInputRef.current?.click(), 50);
            }}
            className="flex items-center justify-center gap-2 bg-gradient-to-r from-teal-600/20 to-cyan-600/20 hover:from-teal-600/30 hover:to-cyan-600/30 border border-teal-500/20 rounded-xl py-3 transition"
          >
            <Camera size={16} className="text-teal-400" />
            <span className="text-xs font-medium text-gray-900 dark:text-white">Snap a Photo</span>
          </button>
        </div>
        <p className="text-[10px] text-gray-400 dark:text-slate-500 text-center">
          AI estimates are approximate — adjust if needed
        </p>
        <input
          ref={photoInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={onPhotoSelect}
        />
      </div>
    );
  }

  // Text input mode
  if (aiMode === "text") {
    return (
      <div className="bg-gray-100 dark:bg-slate-800 rounded-2xl p-4 space-y-3">
        <div className="flex items-center gap-2 mb-1">
          <Sparkles size={14} className="text-violet-400" />
          <p className="text-xs font-semibold text-gray-900 dark:text-white">Describe your meal</p>
        </div>
        <textarea
          value={aiDescription}
          onChange={(e) => onSetAiDescription(e.target.value)}
          placeholder="e.g., 200g grilled chicken breast with a cup of white rice and a mixed green salad with olive oil dressing"
          rows={3}
          autoFocus
          className="w-full bg-gray-200 dark:bg-slate-700 rounded-lg px-3 py-2.5 text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-slate-500 outline-none focus:ring-2 focus:ring-violet-500 resize-none"
        />
        <div className="flex gap-2">
          <button
            onClick={onTextSubmit}
            disabled={!aiDescription.trim()}
            className="flex-1 bg-violet-600 hover:bg-violet-500 disabled:opacity-40 text-white py-2.5 rounded-xl text-xs font-semibold transition flex items-center justify-center gap-1.5"
          >
            <Sparkles size={13} /> Estimate
          </button>
          <button
            onClick={onCancel}
            className="px-4 bg-gray-200 dark:bg-slate-700 hover:bg-gray-300 dark:hover:bg-slate-600 text-gray-600 dark:text-slate-300 py-2.5 rounded-xl text-xs font-medium transition"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  // Photo mode (waiting for file selection)
  if (aiMode === "photo") {
    return (
      <div className="bg-gray-100 dark:bg-slate-800 rounded-2xl p-4 text-center space-y-3">
        <Camera size={24} className="text-teal-400 mx-auto" />
        <p className="text-xs text-gray-500 dark:text-slate-400">Opening camera...</p>
        <button
          onClick={onCancel}
          className="text-xs text-gray-400 dark:text-slate-500 hover:text-gray-900 dark:hover:text-white transition"
        >
          Cancel
        </button>
        <input
          ref={photoInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={onPhotoSelect}
        />
      </div>
    );
  }

  // Loading
  if (aiMode === "loading") {
    return (
      <div className="bg-gray-100 dark:bg-slate-800 rounded-2xl p-6 text-center space-y-3">
        <Loader2 size={28} className="text-teal-400 mx-auto animate-spin" />
        <p className="text-sm text-gray-900 dark:text-white font-medium animate-pulse">
          Analyzing your meal...
        </p>
        <p className="text-[10px] text-gray-400 dark:text-slate-500">
          Estimating portions and nutrition
        </p>
      </div>
    );
  }

  // Preview
  if (aiMode === "preview" && aiResult) {
    return (
      <div className="bg-gray-100 dark:bg-slate-800 rounded-2xl p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Sparkles size={14} className="text-violet-400" />
          <p className="text-xs font-semibold text-gray-900 dark:text-white">AI Estimate</p>
        </div>

        {/* Food items */}
        <div className="space-y-2">
          {aiResult.foods.map((food, i) => (
            <div
              key={i}
              className="bg-gray-200/50 dark:bg-slate-700/50 rounded-lg px-3 py-2"
            >
              <p className="text-xs font-medium text-gray-900 dark:text-white">{food.name}</p>
              <p className="text-[10px] text-gray-500 dark:text-slate-400 mt-0.5">
                {Math.round(food.calories)} cal · P {Math.round(food.protein_g)}g
                · C {Math.round(food.carbs_g)}g · F {Math.round(food.fat_g)}g
              </p>
            </div>
          ))}
        </div>

        {/* Total */}
        {aiResult.foods.length > 1 && (
          <div className="bg-teal-600/10 border border-teal-500/20 rounded-lg px-3 py-2">
            <p className="text-xs font-semibold text-teal-400">Total</p>
            <p className="text-[10px] text-gray-600 dark:text-slate-300 mt-0.5">
              {Math.round(aiResult.total.calories)} cal · P{" "}
              {Math.round(aiResult.total.protein_g)}g · C{" "}
              {Math.round(aiResult.total.carbs_g)}g · F{" "}
              {Math.round(aiResult.total.fat_g)}g
            </p>
          </div>
        )}

        {/* Portion note */}
        {aiResult.portion_note && (
          <p className="text-[10px] text-gray-400 dark:text-slate-500 italic">
            {aiResult.portion_note}
          </p>
        )}

        {/* Actions */}
        <div className="flex gap-2">
          <button
            onClick={onAccept}
            className="flex-1 bg-teal-600 hover:bg-teal-500 text-white py-2.5 rounded-xl text-xs font-semibold transition flex items-center justify-center gap-1.5"
          >
            <Check size={13} /> Accept & Save
          </button>
          <button
            onClick={onEdit}
            className="flex-1 bg-gray-200 dark:bg-slate-700 hover:bg-gray-300 dark:hover:bg-slate-600 text-gray-900 dark:text-white py-2.5 rounded-xl text-xs font-medium transition flex items-center justify-center gap-1.5"
          >
            <Pencil size={13} /> Edit Values
          </button>
        </div>
        <button
          onClick={onCancel}
          className="w-full text-center text-[10px] text-gray-400 dark:text-slate-500 hover:text-gray-900 dark:hover:text-white transition py-1"
        >
          <X size={10} className="inline mr-1" />
          Cancel
        </button>
      </div>
    );
  }

  return null;
}

function MacroMini({
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
  const pct = Math.min(value / target, 1);
  const circumference = 2 * Math.PI * 16;
  const offset = circumference * (1 - pct);
  const statusColor =
    value > target ? "#ef4444" : value > target * 0.85 ? "#eab308" : color;

  return (
    <div className="flex flex-col items-center">
      <div className="relative w-10 h-10 mb-1">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 40 40">
          <circle
            cx="20"
            cy="20"
            r="16"
            fill="none"
            stroke="#334155"
            strokeWidth="3"
          />
          <circle
            cx="20"
            cy="20"
            r="16"
            fill="none"
            stroke={statusColor}
            strokeWidth="3"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            className="transition-all duration-500"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-[9px] font-bold text-gray-900 dark:text-white">{value}g</span>
        </div>
      </div>
      <span className="text-[10px] text-gray-500 dark:text-slate-400">{label}</span>
      <span className="text-[9px] text-gray-400 dark:text-slate-500">/ {target}g</span>
    </div>
  );
}
