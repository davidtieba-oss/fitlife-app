import { format, subDays, startOfWeek, subWeeks, parseISO } from "date-fns";
import {
  type MetricEntry,
  type WorkoutEntry,
  type MealEntry,
  getWorkoutVolume,
} from "./storage";

// Weight moving average
export function computeMovingAverage<T extends { weight: number }>(
  data: T[],
  windowSize = 7
): (T & { movingAvg: number | null })[] {
  return data.map((point, i) => {
    if (i < windowSize - 1) return { ...point, movingAvg: null };
    const window = data.slice(i - windowSize + 1, i + 1);
    const avg = window.reduce((s, p) => s + p.weight, 0) / window.length;
    return { ...point, movingAvg: Math.round(avg * 10) / 10 };
  });
}

// Weight stats for a period
export function computeWeightStats(
  metrics: MetricEntry[],
  periodDays: number
) {
  const cutoff = periodDays > 0 ? subDays(new Date(), periodDays) : new Date(0);
  const filtered = metrics
    .filter((m) => new Date(m.date) >= cutoff)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  if (filtered.length === 0) {
    return { startWeight: null, currentWeight: null, change: null, highest: null, lowest: null, avgWeeklyChange: null };
  }

  const weights = filtered.map((m) => m.weight);
  const startWeight = weights[0];
  const currentWeight = weights[weights.length - 1];
  const change = currentWeight - startWeight;
  const highest = Math.max(...weights);
  const lowest = Math.min(...weights);

  const daySpan =
    (new Date(filtered[filtered.length - 1].date).getTime() -
      new Date(filtered[0].date).getTime()) /
    (1000 * 60 * 60 * 24);
  const weeks = daySpan / 7;
  const avgWeeklyChange = weeks > 0 ? Math.round((change / weeks) * 10) / 10 : null;

  return { startWeight, currentWeight, change, highest, lowest, avgWeeklyChange };
}

// Workouts per week
export function computeWorkoutsPerWeek(
  workouts: WorkoutEntry[],
  weeks = 12
): { week: string; count: number }[] {
  const result: { week: string; count: number }[] = [];
  for (let i = weeks - 1; i >= 0; i--) {
    const weekStart = startOfWeek(subWeeks(new Date(), i), { weekStartsOn: 1 });
    const weekEnd = new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000);
    const count = workouts.filter((w) => {
      const d = new Date(w.date);
      return d >= weekStart && d < weekEnd;
    }).length;
    result.push({ week: format(weekStart, "MMM d"), count });
  }
  return result;
}

// Workout streaks
export function computeWorkoutStreaks(workouts: WorkoutEntry[]) {
  const totalWorkouts = workouts.length;

  // Frequency count for most common type
  const typeCounts: Record<string, number> = {};
  for (const w of workouts) {
    typeCounts[w.name] = (typeCounts[w.name] || 0) + 1;
  }
  const mostCommonType =
    Object.entries(typeCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

  // Build set of weeks that have workouts
  const weeksWithWorkouts = new Set<string>();
  for (const w of workouts) {
    const ws = startOfWeek(new Date(w.date), { weekStartsOn: 1 });
    weeksWithWorkouts.add(format(ws, "yyyy-MM-dd"));
  }

  // Compute streaks by iterating weeks backwards
  let currentStreak = 0;
  let longestStreak = 0;
  let streak = 0;
  const maxWeeksBack = 52;

  for (let i = 0; i < maxWeeksBack; i++) {
    const ws = startOfWeek(subWeeks(new Date(), i), { weekStartsOn: 1 });
    const key = format(ws, "yyyy-MM-dd");
    if (weeksWithWorkouts.has(key)) {
      streak++;
      longestStreak = Math.max(longestStreak, streak);
      if (i === streak - 1) currentStreak = streak;
    } else {
      streak = 0;
    }
  }

  return { currentStreak, longestStreak, totalWorkouts, mostCommonType };
}

// Weekly volume
export function computeWeeklyVolume(
  workouts: WorkoutEntry[],
  weeks = 12
): { week: string; volume: number }[] {
  const result: { week: string; volume: number }[] = [];
  for (let i = weeks - 1; i >= 0; i--) {
    const weekStart = startOfWeek(subWeeks(new Date(), i), { weekStartsOn: 1 });
    const weekEnd = new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000);
    const weekWorkouts = workouts.filter((w) => {
      const d = new Date(w.date);
      return d >= weekStart && d < weekEnd;
    });
    const volume = weekWorkouts.reduce((sum, w) => sum + getWorkoutVolume(w), 0);
    result.push({ week: format(weekStart, "MMM d"), volume });
  }
  return result;
}

// Personal records
export function computePersonalRecords(
  workouts: WorkoutEntry[]
): { exerciseName: string; maxWeight: number; date: string }[] {
  const prs: Record<string, { maxWeight: number; date: string }> = {};
  for (const w of workouts) {
    for (const ex of w.exercises) {
      for (const set of ex.sets) {
        if (!set.completed || set.weight <= 0) continue;
        if (!prs[ex.name] || set.weight > prs[ex.name].maxWeight) {
          prs[ex.name] = { maxWeight: set.weight, date: w.date };
        }
      }
    }
  }
  return Object.entries(prs)
    .map(([exerciseName, { maxWeight, date }]) => ({ exerciseName, maxWeight, date }))
    .sort((a, b) => b.maxWeight - a.maxWeight)
    .slice(0, 10);
}

// Daily calories
export function computeDailyCalories(
  meals: MealEntry[],
  days = 30
): { date: string; calories: number }[] {
  const cutoff = subDays(new Date(), days);
  const byDate: Record<string, number> = {};
  for (const m of meals) {
    if (new Date(m.date) < cutoff) continue;
    byDate[m.date] = (byDate[m.date] || 0) + m.calories;
  }
  return Object.entries(byDate)
    .sort(([a], [b]) => new Date(a).getTime() - new Date(b).getTime())
    .map(([date, calories]) => ({ date: format(parseISO(date), "MMM d"), calories }));
}

// Average macros
export function computeAverageMacros(meals: MealEntry[], days = 30) {
  const cutoff = subDays(new Date(), days);
  const byDate: Record<string, { cal: number; p: number; c: number; f: number }> = {};
  for (const m of meals) {
    if (new Date(m.date) < cutoff) continue;
    if (!byDate[m.date]) byDate[m.date] = { cal: 0, p: 0, c: 0, f: 0 };
    byDate[m.date].cal += m.calories;
    byDate[m.date].p += m.protein;
    byDate[m.date].c += m.carbs;
    byDate[m.date].f += m.fat;
  }
  const days_ = Object.values(byDate);
  const n = days_.length;
  if (n === 0) return { avgCalories: 0, avgProtein: 0, avgCarbs: 0, avgFat: 0, daysWithData: 0 };
  return {
    avgCalories: Math.round(days_.reduce((s, d) => s + d.cal, 0) / n),
    avgProtein: Math.round(days_.reduce((s, d) => s + d.p, 0) / n),
    avgCarbs: Math.round(days_.reduce((s, d) => s + d.c, 0) / n),
    avgFat: Math.round(days_.reduce((s, d) => s + d.f, 0) / n),
    daysWithData: n,
  };
}

// Adherence score
export function computeAdherenceScore(
  meals: MealEntry[],
  calorieTarget: number,
  days = 30
) {
  const cutoff = subDays(new Date(), days);
  const byDate: Record<string, number> = {};
  for (const m of meals) {
    if (new Date(m.date) < cutoff) continue;
    byDate[m.date] = (byDate[m.date] || 0) + m.calories;
  }
  const totalDays = Object.keys(byDate).length;
  if (totalDays === 0) return { score: 0, daysOnTarget: 0, totalDays: 0 };
  const daysOnTarget = Object.values(byDate).filter(
    (cal) => Math.abs(cal - calorieTarget) / calorieTarget <= 0.1
  ).length;
  return {
    score: Math.round((daysOnTarget / totalDays) * 100),
    daysOnTarget,
    totalDays,
  };
}
