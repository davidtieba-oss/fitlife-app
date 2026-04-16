"use client";

import { useState, useEffect, useCallback } from "react";
import { format, parseISO } from "date-fns";
import {
  Sparkles,
  Loader2,
  ChevronDown,
  ChevronUp,
  Trash2,
  ShoppingCart,
  UtensilsCrossed,
  RefreshCw,
  Calendar,
  ArrowLeft,
} from "lucide-react";
import {
  getSettings,
  getMacroTargets,
  getMealPlans,
  saveMealPlan,
  deleteMealPlan,
  updateMealPlanDay,
  saveMeal,
  getGroceryList,
  saveGroceryItem,
  GROCERY_CATEGORIES,
  type UserSettings,
  type MealPlan,
  type MealPlanDay,
  type MealPlanMeal,
} from "@/lib/storage";
import { askAI } from "@/lib/ai";
import { ListSkeleton } from "@/components/Skeleton";
import Toast from "@/components/Toast";
import AIBadge from "@/components/AIBadge";

const DIETS = ["No Restriction", "High Protein", "Low Carb", "Mediterranean", "Vegetarian", "Vegan"];
const MEALS_PER_DAY = [3, 4, 5];
const PLAN_DAYS = [1, 3, 5, 7];
const CUISINES = ["Any", "Mediterranean", "Asian", "Latin", "Mixed"];
const DAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

export default function PlanPage() {
  const [mounted, setMounted] = useState(false);
  const [settings, setSettingsState] = useState<UserSettings | null>(null);
  const [plans, setPlans] = useState<MealPlan[]>([]);
  const [toast, setToast] = useState("");

  // Generator form
  const [diet, setDiet] = useState("No Restriction");
  const [mealsPerDay, setMealsPerDay] = useState(3);
  const [planDays, setPlanDays] = useState(7);
  const [allergies, setAllergies] = useState("");
  const [cuisine, setCuisine] = useState("Any");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [regeneratingDay, setRegeneratingDay] = useState<number | null>(null);

  // Viewing state
  const [viewingPlan, setViewingPlan] = useState<MealPlan | null>(null);
  const [expandedDay, setExpandedDay] = useState<number | null>(null);
  const [expandedMeal, setExpandedMeal] = useState<string | null>(null);

  const refreshPlans = useCallback(() => setPlans(getMealPlans()), []);

  useEffect(() => {
    setMounted(true);
    setSettingsState(getSettings());
    refreshPlans();
  }, [refreshPlans]);

  if (!mounted || !settings) {
    return (
      <ListSkeleton />
    );
  }

  const macroTargets = getMacroTargets(settings);

  function buildMealPlanPrompt(dayNames: string[]) {
    return `Generate a ${dayNames.length}-day meal plan.

Nutrition targets per day:
- Calories: ${settings!.calorieTarget} kcal
- Protein: ${macroTargets.protein}g
- Carbs: ${macroTargets.carbs}g
- Fat: ${macroTargets.fat}g

Preferences:
- Diet: ${diet}
- Meals per day: ${mealsPerDay}
- Cuisine: ${cuisine}
${allergies ? `- Allergies/exclusions: ${allergies}` : "- No allergies"}

Days: ${dayNames.join(", ")}

Meal types for ${mealsPerDay} meals/day: ${mealsPerDay === 3 ? "Breakfast, Lunch, Dinner" : mealsPerDay === 4 ? "Breakfast, Lunch, Snack, Dinner" : "Breakfast, Snack, Lunch, Snack, Dinner"}

Return ONLY valid JSON (no markdown, no code blocks) with this exact structure:
{"days":[{"day":"${dayNames[0]}","meals":[{"type":"Breakfast","name":"string","description":"string","calories":350,"protein_g":25,"carbs_g":40,"fat_g":10,"ingredients":["200g Greek yogurt","100g berries"]}]}],"grocery_list":[{"item":"Greek yogurt","quantity":"1.4kg","category":"Dairy"}]}

Requirements:
- Each day's total should be close to ${settings!.calorieTarget} calories
- Macros should approximately match the targets
- Be specific with quantities in descriptions and ingredients
- Grocery list should cover ALL ingredients across all days, combining quantities for duplicates
- Grocery categories: ${GROCERY_CATEGORIES.join(", ")}
- Meals should be varied and practical to prepare`;
  }

  async function generatePlan() {
    setLoading(true);
    setError("");
    try {
      const dayNames = DAY_NAMES.slice(0, planDays);
      const prompt = buildMealPlanPrompt(dayNames);

      const text = await askAI({
        system: "You are an expert nutritionist and meal planner. Create detailed, practical meal plans with accurate macro estimates. Return ONLY valid JSON with no additional text.",
        userMessage: prompt,
        maxTokens: 8192,
      });

      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error("Could not parse meal plan data");
      const parsed = JSON.parse(jsonMatch[0]);

      if (!parsed.days || !Array.isArray(parsed.days)) {
        throw new Error("Invalid meal plan format");
      }

      const saved = saveMealPlan({
        preferences: { diet, mealsPerDay, days: planDays, allergies, cuisine },
        days: parsed.days,
        grocery_list: parsed.grocery_list || [],
      });

      refreshPlans();
      setViewingPlan(saved);
      setExpandedDay(0);
      setToast("Meal plan generated!");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate plan");
    } finally {
      setLoading(false);
    }
  }

  async function regenerateDay(dayIndex: number) {
    if (!viewingPlan) return;
    setRegeneratingDay(dayIndex);
    try {
      const dayName = viewingPlan.days[dayIndex].day;
      const prompt = buildMealPlanPrompt([dayName]);

      const text = await askAI({
        system: "You are an expert nutritionist. Regenerate meals for one day. Return ONLY valid JSON with no additional text.",
        userMessage: prompt + "\n\nOnly generate for this single day. Keep the same JSON structure but with just 1 day in the days array.",
        maxTokens: 2048,
      });

      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error("Could not parse regenerated day");
      const parsed = JSON.parse(jsonMatch[0]);

      if (parsed.days?.[0]) {
        const newDay: MealPlanDay = { ...parsed.days[0], day: dayName };
        updateMealPlanDay(viewingPlan.id, dayIndex, newDay);
        refreshPlans();
        const updated = getMealPlans().find((p) => p.id === viewingPlan.id);
        if (updated) setViewingPlan(updated);
        setToast(`${dayName} regenerated!`);
      }
    } catch (err) {
      setToast(err instanceof Error ? err.message : "Failed to regenerate");
    } finally {
      setRegeneratingDay(null);
    }
  }

  function addToGroceryList() {
    if (!viewingPlan) return;
    const existing = getGroceryList();
    const existingNames = new Set(existing.map((i) => i.name.toLowerCase()));
    let added = 0;

    for (const item of viewingPlan.grocery_list) {
      const name = `${item.item} (${item.quantity})`;
      if (existingNames.has(name.toLowerCase())) continue;
      const category = GROCERY_CATEGORIES.includes(item.category as typeof GROCERY_CATEGORIES[number])
        ? item.category
        : "Other";
      saveGroceryItem({ name, category, checked: false });
      added++;
    }

    setToast(added > 0 ? `${added} items added to grocery list!` : "All items already in grocery list");
  }

  function logMeal(meal: MealPlanMeal) {
    saveMeal({
      date: format(new Date(), "yyyy-MM-dd"),
      mealType: (meal.type === "Snack" ? "Snack" : meal.type) as "Breakfast" | "Lunch" | "Dinner" | "Snack",
      foodName: meal.name,
      calories: Math.round(meal.calories),
      protein: Math.round(meal.protein_g),
      carbs: Math.round(meal.carbs_g),
      fat: Math.round(meal.fat_g),
    });
    setToast(`${meal.name} logged!`);
  }

  function getDayTotals(day: MealPlanDay) {
    return day.meals.reduce(
      (acc, m) => ({
        calories: acc.calories + m.calories,
        protein: acc.protein + m.protein_g,
        carbs: acc.carbs + m.carbs_g,
        fat: acc.fat + m.fat_g,
      }),
      { calories: 0, protein: 0, carbs: 0, fat: 0 }
    );
  }

  return (
    <div className="space-y-4">
      {toast && <Toast message={toast} onClose={() => setToast("")} />}

      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Meal Plan</h1>
        <AIBadge label="Meal Plan" />
      </div>

      {/* Nutrition targets reference */}
      <div className="bg-gray-100 dark:bg-slate-800 rounded-2xl p-4">
        <p className="text-xs text-gray-500 dark:text-slate-400 font-medium mb-2">Daily Targets</p>
        <div className="flex items-center gap-4">
          <div className="text-center">
            <p className="text-lg font-bold text-gray-900 dark:text-white">{settings.calorieTarget}</p>
            <p className="text-[10px] text-gray-500 dark:text-slate-400">cal</p>
          </div>
          <div className="h-8 w-px bg-gray-200 dark:bg-slate-700" />
          <div className="flex-1 grid grid-cols-3 gap-2">
            <div className="text-center">
              <p className="text-xs font-bold text-teal-400">{macroTargets.protein}g</p>
              <p className="text-[9px] text-gray-400 dark:text-slate-500">Protein</p>
            </div>
            <div className="text-center">
              <p className="text-xs font-bold text-cyan-400">{macroTargets.carbs}g</p>
              <p className="text-[9px] text-gray-400 dark:text-slate-500">Carbs</p>
            </div>
            <div className="text-center">
              <p className="text-xs font-bold text-amber-400">{macroTargets.fat}g</p>
              <p className="text-[9px] text-gray-400 dark:text-slate-500">Fat</p>
            </div>
          </div>
        </div>
      </div>

      {/* Plan viewer */}
      {viewingPlan ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <button
              onClick={() => { setViewingPlan(null); setExpandedDay(null); setExpandedMeal(null); }}
              className="flex items-center gap-1 text-xs text-teal-400 hover:text-teal-300"
            >
              <ArrowLeft size={14} /> All Plans
            </button>
            <button
              onClick={addToGroceryList}
              className="flex items-center gap-1 text-xs bg-gray-200 dark:bg-slate-700 hover:bg-gray-300 dark:hover:bg-slate-600 text-gray-900 dark:text-white px-3 py-1.5 rounded-lg transition"
            >
              <ShoppingCart size={12} /> Add to Grocery
            </button>
          </div>

          <div className="bg-gray-100 dark:bg-slate-800 rounded-xl px-4 py-2.5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-gray-900 dark:text-white">
                {viewingPlan.days.length}-Day {viewingPlan.preferences.diet} Plan
              </p>
              <p className="text-[10px] text-gray-500 dark:text-slate-400">
                {viewingPlan.preferences.mealsPerDay} meals/day · {viewingPlan.preferences.cuisine} cuisine
              </p>
            </div>
            <p className="text-[10px] text-gray-400 dark:text-slate-500">
              {format(parseISO(viewingPlan.createdAt), "MMM d")}
            </p>
          </div>

          {/* Day cards */}
          {viewingPlan.days.map((day, dayIdx) => {
            const totals = getDayTotals(day);
            const isExpanded = expandedDay === dayIdx;
            const calDiff = totals.calories - settings.calorieTarget;

            return (
              <div key={dayIdx} className="bg-gray-100 dark:bg-slate-800 rounded-xl overflow-hidden">
                <button
                  onClick={() => setExpandedDay(isExpanded ? null : dayIdx)}
                  className="w-full px-4 py-3 flex items-center justify-between text-left"
                >
                  <div>
                    <p className="text-xs font-semibold text-gray-900 dark:text-white">{day.day}</p>
                    <p className="text-[10px] text-gray-500 dark:text-slate-400">
                      {totals.calories} cal · P {totals.protein}g · C {totals.carbs}g · F {totals.fat}g
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {Math.abs(calDiff) > 100 && (
                      <span className={`text-[9px] ${calDiff > 0 ? "text-red-400" : "text-green-400"}`}>
                        {calDiff > 0 ? "+" : ""}{Math.round(calDiff)}
                      </span>
                    )}
                    {isExpanded ? <ChevronUp size={16} className="text-gray-500 dark:text-slate-400" /> : <ChevronDown size={16} className="text-gray-500 dark:text-slate-400" />}
                  </div>
                </button>

                {isExpanded && (
                  <div className="px-4 pb-3 space-y-2 border-t border-gray-200/50 dark:border-slate-700/50 pt-2">
                    {day.meals.map((meal, mealIdx) => {
                      const mealKey = `${dayIdx}-${mealIdx}`;
                      const mealExpanded = expandedMeal === mealKey;

                      return (
                        <div key={mealIdx} className="bg-gray-200/30 dark:bg-slate-700/30 rounded-lg overflow-hidden">
                          <button
                            onClick={() => setExpandedMeal(mealExpanded ? null : mealKey)}
                            className="w-full px-3 py-2 text-left"
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex-1 min-w-0">
                                <p className="text-[10px] text-teal-400 font-semibold">{meal.type}</p>
                                <p className="text-xs font-medium text-gray-900 dark:text-white truncate">{meal.name}</p>
                                <p className="text-[10px] text-gray-500 dark:text-slate-400">
                                  {Math.round(meal.calories)} cal · P {Math.round(meal.protein_g)}g · C {Math.round(meal.carbs_g)}g · F {Math.round(meal.fat_g)}g
                                </p>
                              </div>
                              {mealExpanded ? <ChevronUp size={12} className="text-gray-400 dark:text-slate-500" /> : <ChevronDown size={12} className="text-gray-400 dark:text-slate-500" />}
                            </div>
                          </button>

                          {mealExpanded && (
                            <div className="px-3 pb-2.5 space-y-2">
                              <p className="text-[10px] text-gray-600 dark:text-slate-300">{meal.description}</p>
                              {meal.ingredients.length > 0 && (
                                <div>
                                  <p className="text-[9px] text-gray-400 dark:text-slate-500 font-medium mb-0.5">Ingredients</p>
                                  <ul className="space-y-0.5">
                                    {meal.ingredients.map((ing, i) => (
                                      <li key={i} className="text-[10px] text-gray-500 dark:text-slate-400">• {ing}</li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                              <button
                                onClick={() => logMeal(meal)}
                                className="w-full flex items-center justify-center gap-1 bg-teal-600/20 hover:bg-teal-600/30 text-teal-400 py-1.5 rounded-lg text-[10px] font-medium transition"
                              >
                                <UtensilsCrossed size={11} /> Log This Meal
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}

                    {/* Day totals */}
                    <div className="bg-gray-200/50 dark:bg-slate-700/50 rounded-lg px-3 py-2 flex items-center justify-between">
                      <span className="text-[10px] text-gray-600 dark:text-slate-300 font-medium">Day Total</span>
                      <span className="text-[10px] text-gray-500 dark:text-slate-400">
                        {totals.calories} cal · P {totals.protein}g · C {totals.carbs}g · F {totals.fat}g
                      </span>
                    </div>

                    {/* Regenerate button */}
                    <button
                      onClick={() => regenerateDay(dayIdx)}
                      disabled={regeneratingDay !== null}
                      className="w-full flex items-center justify-center gap-1 text-[10px] text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:hover:text-slate-300 py-1 transition disabled:opacity-40"
                    >
                      {regeneratingDay === dayIdx ? (
                        <><Loader2 size={11} className="animate-spin" /> Regenerating...</>
                      ) : (
                        <><RefreshCw size={11} /> Regenerate {day.day}</>
                      )}
                    </button>
                  </div>
                )}
              </div>
            );
          })}

          {/* Grocery list summary */}
          {viewingPlan.grocery_list.length > 0 && (
            <div className="bg-gray-100 dark:bg-slate-800 rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-semibold text-gray-600 dark:text-slate-300">Grocery List</p>
                <span className="text-[10px] text-gray-400 dark:text-slate-500">{viewingPlan.grocery_list.length} items</span>
              </div>
              <div className="space-y-1 max-h-40 overflow-y-auto">
                {viewingPlan.grocery_list.map((item, i) => (
                  <div key={i} className="flex items-center justify-between text-[10px]">
                    <span className="text-gray-600 dark:text-slate-300">{item.item}</span>
                    <span className="text-gray-400 dark:text-slate-500">{item.quantity}</span>
                  </div>
                ))}
              </div>
              <button
                onClick={addToGroceryList}
                className="w-full mt-3 flex items-center justify-center gap-1.5 bg-teal-600 hover:bg-teal-500 text-white py-2 rounded-lg text-xs font-medium transition"
              >
                <ShoppingCart size={14} /> Add All to Grocery List
              </button>
            </div>
          )}

          {/* Delete plan */}
          <button
            onClick={() => {
              deleteMealPlan(viewingPlan.id);
              refreshPlans();
              setViewingPlan(null);
              setToast("Plan deleted");
            }}
            className="w-full flex items-center justify-center gap-1.5 text-xs text-gray-400 dark:text-slate-500 hover:text-red-400 py-2 transition"
          >
            <Trash2 size={12} /> Delete Plan
          </button>
        </div>
      ) : (
        <>
          {/* Saved plans */}
          {plans.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs text-gray-500 dark:text-slate-400 font-medium">Saved Plans</p>
              {plans.map((p) => (
                <button
                  key={p.id}
                  onClick={() => { setViewingPlan(p); setExpandedDay(0); setExpandedMeal(null); }}
                  className="w-full bg-gray-100 dark:bg-slate-800 rounded-xl px-4 py-3 text-left hover:bg-gray-200/80 dark:hover:bg-slate-700/80 transition"
                >
                  <div className="flex items-center gap-2">
                    <Calendar size={14} className="text-teal-400 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-gray-900 dark:text-white">
                        {p.days.length}-Day {p.preferences.diet} Plan
                      </p>
                      <p className="text-[10px] text-gray-500 dark:text-slate-400">
                        {p.preferences.mealsPerDay} meals/day · {p.preferences.cuisine} · {format(parseISO(p.createdAt), "MMM d, yyyy")}
                      </p>
                    </div>
                    <ChevronDown size={14} className="text-gray-400 dark:text-slate-500 -rotate-90 shrink-0" />
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Generator form */}
          <div className="bg-gray-100 dark:bg-slate-800 rounded-2xl p-4 space-y-3">
            <div className="flex items-center gap-2 mb-1">
              <Sparkles size={14} className="text-violet-400" />
              <p className="text-xs font-semibold text-gray-900 dark:text-white">Generate Meal Plan</p>
            </div>

            <div>
              <label className="text-[10px] text-gray-500 dark:text-slate-400 font-medium">Diet Type</label>
              <div className="grid grid-cols-3 gap-1.5 mt-1">
                {DIETS.map((d) => (
                  <button
                    key={d}
                    onClick={() => setDiet(d)}
                    className={`py-2 rounded-lg text-[10px] font-medium transition ${
                      diet === d ? "bg-teal-600 text-white" : "bg-gray-200 dark:bg-slate-700 text-gray-500 dark:text-slate-400"
                    }`}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-[10px] text-gray-500 dark:text-slate-400 font-medium">Meals Per Day</label>
              <div className="grid grid-cols-3 gap-1.5 mt-1">
                {MEALS_PER_DAY.map((m) => (
                  <button
                    key={m}
                    onClick={() => setMealsPerDay(m)}
                    className={`py-2 rounded-lg text-xs font-medium transition ${
                      mealsPerDay === m ? "bg-teal-600 text-white" : "bg-gray-200 dark:bg-slate-700 text-gray-500 dark:text-slate-400"
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-[10px] text-gray-500 dark:text-slate-400 font-medium">Days to Plan</label>
              <div className="grid grid-cols-4 gap-1.5 mt-1">
                {PLAN_DAYS.map((d) => (
                  <button
                    key={d}
                    onClick={() => setPlanDays(d)}
                    className={`py-2 rounded-lg text-xs font-medium transition ${
                      planDays === d ? "bg-teal-600 text-white" : "bg-gray-200 dark:bg-slate-700 text-gray-500 dark:text-slate-400"
                    }`}
                  >
                    {d} day{d > 1 ? "s" : ""}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-[10px] text-gray-500 dark:text-slate-400 font-medium">Cuisine Preference</label>
              <div className="grid grid-cols-3 gap-1.5 mt-1">
                {CUISINES.map((c) => (
                  <button
                    key={c}
                    onClick={() => setCuisine(c)}
                    className={`py-2 rounded-lg text-[10px] font-medium transition ${
                      cuisine === c ? "bg-teal-600 text-white" : "bg-gray-200 dark:bg-slate-700 text-gray-500 dark:text-slate-400"
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-[10px] text-gray-500 dark:text-slate-400 font-medium">Allergies / Exclusions (optional)</label>
              <textarea
                value={allergies}
                onChange={(e) => setAllergies(e.target.value)}
                placeholder="e.g., no shellfish, lactose intolerant, no nuts..."
                rows={2}
                className="w-full mt-1 bg-gray-200 dark:bg-slate-700 rounded-lg px-3 py-2 text-xs text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-slate-500 outline-none focus:ring-2 focus:ring-violet-500 resize-none"
              />
            </div>

            {error && <p className="text-xs text-red-400">{error}</p>}

            <button
              onClick={generatePlan}
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-violet-600 to-teal-600 hover:from-violet-500 hover:to-teal-500 disabled:opacity-50 text-white py-3 rounded-xl text-sm font-semibold transition"
            >
              {loading ? (
                <><Loader2 size={16} className="animate-spin" /> Generating...</>
              ) : (
                <><Sparkles size={16} /> Generate Meal Plan</>
              )}
            </button>

            <p className="text-[10px] text-gray-400 dark:text-slate-500 text-center">
              AI plans are suggestions — adjust portions to your needs
            </p>
          </div>
        </>
      )}
    </div>
  );
}
