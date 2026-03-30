"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { format, parseISO } from "date-fns";
import {
  Plus,
  Trash2,
  Clock,
  Dumbbell,
  ChevronDown,
  ChevronUp,
  Check,
  X,
  Save,
  Play,
  Square,
  Sparkles,
  Loader2,
  Star,
  Coffee,
  Calendar,
} from "lucide-react";
import {
  getWorkouts,
  saveWorkout,
  deleteWorkout,
  getTemplates,
  saveTemplate,
  getWorkoutVolume,
  getTrainingPlans,
  saveTrainingPlan,
  deleteTrainingPlan,
  setActivePlan,
  type WorkoutEntry,
  type WorkoutExercise,
  type WorkoutSet,
  type TrainingPlan,
  type PlanDay,
} from "@/lib/storage";
import { askAI } from "@/lib/ai";
import { exercises as exerciseDb, type Exercise } from "@/data/exercises";
import Toast from "@/components/Toast";
import ExercisePicker from "@/components/ExercisePicker";
import RestTimer from "@/components/RestTimer";

type View = "new" | "history" | "ai";

export default function WorkoutsPage() {
  const [mounted, setMounted] = useState(false);
  const [view, setView] = useState<View>("history");
  const [workouts, setWorkouts] = useState<WorkoutEntry[]>([]);
  const [toast, setToast] = useState("");

  // New workout state
  const [workoutName, setWorkoutName] = useState("");
  const [workoutExercises, setWorkoutExercises] = useState<WorkoutExercise[]>([]);
  const [showPicker, setShowPicker] = useState(false);
  const [workoutActive, setWorkoutActive] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const startTimeRef = useRef<number>(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // History state
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // AI Plan state
  const [plans, setPlans] = useState<TrainingPlan[]>([]);
  const [aiGoal, setAiGoal] = useState("Build Muscle");
  const [aiLevel, setAiLevel] = useState("Intermediate");
  const [aiDays, setAiDays] = useState("4");
  const [aiEquipment, setAiEquipment] = useState("Full Gym");
  const [aiDuration, setAiDuration] = useState("60 min");
  const [aiInjuries, setAiInjuries] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState("");
  const [viewingPlan, setViewingPlan] = useState<TrainingPlan | null>(null);
  const [expandedDay, setExpandedDay] = useState<string | null>(null);

  const refresh = useCallback(() => setWorkouts(getWorkouts()), []);
  const refreshPlans = useCallback(() => setPlans(getTrainingPlans()), []);

  useEffect(() => {
    setMounted(true);
    refresh();
    refreshPlans();
  }, [refresh, refreshPlans]);

  // Workout timer
  useEffect(() => {
    if (workoutActive) {
      startTimeRef.current = Date.now() - elapsed * 1000;
      timerRef.current = setInterval(() => {
        setElapsed(Math.floor((Date.now() - startTimeRef.current) / 1000));
      }, 1000);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workoutActive]);

  if (!mounted) {
    return (
      <div className="h-screen flex items-center justify-center text-slate-500">
        Loading...
      </div>
    );
  }

  const templates = getTemplates();

  function startFromTemplate(templateId: string) {
    const tpl = templates.find((t) => t.id === templateId);
    if (!tpl) return;
    setWorkoutName(tpl.name);
    setWorkoutExercises(
      tpl.exerciseIds
        .map((eid) => {
          const ex = exerciseDb.find((e) => e.id === eid);
          if (!ex) return null;
          return {
            exerciseId: ex.id,
            name: ex.name,
            sets: [{ reps: 0, weight: 0, completed: false }],
          };
        })
        .filter(Boolean) as WorkoutExercise[]
    );
    setWorkoutActive(true);
    setElapsed(0);
    setView("new");
  }

  function addExercise(ex: Exercise) {
    setWorkoutExercises((prev) => [
      ...prev,
      {
        exerciseId: ex.id,
        name: ex.name,
        sets: [{ reps: 0, weight: 0, completed: false }],
      },
    ]);
    if (!workoutActive) {
      setWorkoutActive(true);
      setElapsed(0);
    }
  }

  function removeExercise(idx: number) {
    setWorkoutExercises((prev) => prev.filter((_, i) => i !== idx));
  }

  function updateSet(exIdx: number, setIdx: number, field: keyof WorkoutSet, value: number | boolean) {
    setWorkoutExercises((prev) => {
      const next = [...prev];
      const ex = { ...next[exIdx], sets: [...next[exIdx].sets] };
      ex.sets[setIdx] = { ...ex.sets[setIdx], [field]: value };
      next[exIdx] = ex;
      return next;
    });
  }

  function addSet(exIdx: number) {
    setWorkoutExercises((prev) => {
      const next = [...prev];
      const ex = { ...next[exIdx], sets: [...next[exIdx].sets] };
      const lastSet = ex.sets[ex.sets.length - 1];
      ex.sets.push({ reps: lastSet?.reps ?? 0, weight: lastSet?.weight ?? 0, completed: false });
      next[exIdx] = ex;
      return next;
    });
  }

  function deleteSet(exIdx: number, setIdx: number) {
    setWorkoutExercises((prev) => {
      const next = [...prev];
      const ex = { ...next[exIdx], sets: [...next[exIdx].sets] };
      ex.sets.splice(setIdx, 1);
      next[exIdx] = ex;
      return next;
    });
  }

  function finishWorkout() {
    if (!workoutName.trim() || workoutExercises.length === 0) return;
    saveWorkout({
      date: new Date().toISOString(),
      name: workoutName.trim(),
      duration: Math.round(elapsed / 60),
      exercises: workoutExercises,
    });
    setWorkoutActive(false);
    setElapsed(0);
    setWorkoutName("");
    setWorkoutExercises([]);
    setToast("Workout saved!");
    refresh();
    setView("history");
  }

  function cancelWorkout() {
    setWorkoutActive(false);
    setElapsed(0);
    setWorkoutName("");
    setWorkoutExercises([]);
  }

  function saveAsTemplate() {
    if (!workoutName.trim() || workoutExercises.length === 0) return;
    saveTemplate({
      name: workoutName.trim(),
      exerciseIds: workoutExercises.map((e) => e.exerciseId),
    });
    setToast("Template saved!");
  }

  // Start workout from AI plan day
  function startFromPlanDay(day: PlanDay) {
    setWorkoutName(day.workout_name);
    setWorkoutExercises(
      day.exercises.map((ex) => {
        const match = exerciseDb.find(
          (e) => e.name.toLowerCase() === ex.name.toLowerCase()
        );
        return {
          exerciseId: match?.id ?? ex.name.toLowerCase().replace(/\s+/g, "-"),
          name: ex.name,
          sets: Array.from({ length: ex.sets }, () => ({
            reps: parseInt(ex.reps) || 0,
            weight: 0,
            completed: false,
          })),
        };
      })
    );
    setWorkoutActive(true);
    setElapsed(0);
    setView("new");
  }

  // Generate AI plan
  async function generatePlan() {
    setAiLoading(true);
    setAiError("");
    try {
      const prompt = `Generate a weekly training program.

Goal: ${aiGoal}
Experience: ${aiLevel}
Days per week: ${aiDays}
Equipment: ${aiEquipment}
Session length: ${aiDuration}
${aiInjuries ? `Injuries/limitations: ${aiInjuries}` : "No injuries or limitations."}

Return ONLY valid JSON (no markdown, no code blocks) matching this exact structure:
{"plan_name":"string","description":"string","days":[{"day":"Monday","workout_name":"string","exercises":[{"name":"string","sets":4,"reps":"8-10","rest_seconds":90,"notes":"string"}]}],"rest_days":["Wednesday","Sunday"],"progression_notes":"string"}

Requirements:
- Use exactly ${aiDays} training days from Monday through Sunday
- Remaining days should be rest days
- Each exercise should have realistic sets (3-5), reps, and rest times
- Include 4-8 exercises per session
- Notes should include form cues or tempo guidance`;

      const text = await askAI({
        system: "You are an expert strength and conditioning coach. Generate detailed, evidence-based training programs. Return ONLY valid JSON with no additional text.",
        userMessage: prompt,
        maxTokens: 4096,
      });

      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error("Could not parse plan data");
      const parsed = JSON.parse(jsonMatch[0]);

      if (!parsed.plan_name || !parsed.days || !Array.isArray(parsed.days)) {
        throw new Error("Invalid plan format");
      }

      const saved = saveTrainingPlan({
        plan_name: parsed.plan_name,
        description: parsed.description || "",
        days: parsed.days,
        rest_days: parsed.rest_days || [],
        progression_notes: parsed.progression_notes || "",
        isActive: plans.length === 0, // Auto-activate if first plan
      });

      refreshPlans();
      setViewingPlan(saved);
      setToast("Plan generated!");
    } catch (err) {
      setAiError(err instanceof Error ? err.message : "Failed to generate plan");
    } finally {
      setAiLoading(false);
    }
  }

  function handleDelete(id: string) {
    if (confirmDeleteId === id) {
      deleteWorkout(id);
      setConfirmDeleteId(null);
      refresh();
    } else {
      setConfirmDeleteId(id);
      setTimeout(() => setConfirmDeleteId(null), 3000);
    }
  }

  const elapsedMins = Math.floor(elapsed / 60);
  const elapsedSecs = elapsed % 60;

  return (
    <div className="space-y-4">
      {toast && <Toast message={toast} onClose={() => setToast("")} />}
      {showPicker && (
        <ExercisePicker
          onSelect={addExercise}
          onClose={() => setShowPicker(false)}
          excludeIds={workoutExercises.map((e) => e.exerciseId)}
        />
      )}

      <h1 className="text-xl font-bold">Workouts</h1>

      {/* View toggle */}
      <div className="flex bg-slate-800 rounded-xl p-1">
        {(["new", "history", "ai"] as const).map((v) => (
          <button
            key={v}
            onClick={() => setView(v)}
            className={`flex-1 py-2 rounded-lg text-xs font-medium transition ${
              view === v ? "bg-teal-600 text-white" : "text-slate-400"
            }`}
          >
            {v === "new" ? "New Workout" : v === "history" ? "History" : "AI Plan"}
          </button>
        ))}
      </div>

      {view === "new" && (
        <div className="space-y-3">
          {/* Active timer bar */}
          {workoutActive && (
            <div className="bg-teal-900/40 border border-teal-700/50 rounded-xl px-4 py-2.5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-teal-400 animate-pulse" />
                <span className="text-sm font-medium text-teal-300">
                  {elapsedMins}:{elapsedSecs.toString().padStart(2, "0")}
                </span>
              </div>
              <RestTimer />
            </div>
          )}

          {/* Workout name */}
          <input
            type="text"
            value={workoutName}
            onChange={(e) => setWorkoutName(e.target.value)}
            placeholder="Workout name..."
            className="w-full bg-slate-800 rounded-xl px-4 py-3 text-sm text-white outline-none focus:ring-2 focus:ring-teal-500 font-medium"
          />

          {/* Templates */}
          {workoutExercises.length === 0 && (
            <div>
              <p className="text-xs text-slate-400 font-medium mb-2">Start from template</p>
              <div className="grid grid-cols-3 gap-2">
                {templates.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => startFromTemplate(t.id)}
                    className="bg-slate-800 hover:bg-slate-700 rounded-xl px-3 py-2.5 text-xs font-medium text-white transition text-center"
                  >
                    <Play size={14} className="mx-auto mb-1 text-teal-400" />
                    {t.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Exercises */}
          {workoutExercises.map((ex, exIdx) => (
            <div key={exIdx} className="bg-slate-800 rounded-xl p-3 space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-white">{ex.name}</p>
                <button
                  onClick={() => removeExercise(exIdx)}
                  className="text-slate-500 hover:text-red-400 p-0.5 transition"
                >
                  <X size={16} />
                </button>
              </div>
              {/* Set headers */}
              <div className="grid grid-cols-[2rem_1fr_1fr_2rem_2rem] gap-1.5 items-center text-[10px] text-slate-500 font-medium px-1">
                <span>Set</span>
                <span>Reps</span>
                <span>kg</span>
                <span />
                <span />
              </div>
              {/* Sets */}
              {ex.sets.map((set, setIdx) => (
                <div
                  key={setIdx}
                  className={`grid grid-cols-[2rem_1fr_1fr_2rem_2rem] gap-1.5 items-center ${
                    set.completed ? "opacity-60" : ""
                  }`}
                >
                  <span className="text-xs text-slate-400 text-center font-medium">
                    {setIdx + 1}
                  </span>
                  <input
                    type="number"
                    value={set.reps || ""}
                    onChange={(e) =>
                      updateSet(exIdx, setIdx, "reps", parseInt(e.target.value) || 0)
                    }
                    placeholder="0"
                    className="bg-slate-700 rounded-lg px-2 py-1.5 text-xs text-white text-center outline-none focus:ring-1 focus:ring-teal-500"
                  />
                  <input
                    type="number"
                    value={set.weight || ""}
                    onChange={(e) =>
                      updateSet(exIdx, setIdx, "weight", parseFloat(e.target.value) || 0)
                    }
                    placeholder="0"
                    step="0.5"
                    className="bg-slate-700 rounded-lg px-2 py-1.5 text-xs text-white text-center outline-none focus:ring-1 focus:ring-teal-500"
                  />
                  <button
                    onClick={() => updateSet(exIdx, setIdx, "completed", !set.completed)}
                    className={`w-7 h-7 rounded-lg flex items-center justify-center transition ${
                      set.completed
                        ? "bg-teal-600 text-white"
                        : "bg-slate-700 text-slate-400 hover:text-teal-400"
                    }`}
                  >
                    <Check size={14} />
                  </button>
                  <button
                    onClick={() => deleteSet(exIdx, setIdx)}
                    className="w-7 h-7 rounded-lg flex items-center justify-center bg-slate-700 text-slate-500 hover:text-red-400 transition"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
              <button
                onClick={() => addSet(exIdx)}
                className="w-full text-xs text-teal-400 hover:text-teal-300 py-1 transition font-medium"
              >
                + Add Set
              </button>
            </div>
          ))}

          {/* Add exercise button */}
          <button
            onClick={() => setShowPicker(true)}
            className="w-full flex items-center justify-center gap-1.5 bg-slate-800 hover:bg-slate-700 border border-dashed border-slate-600 text-slate-300 py-3 rounded-xl text-sm font-medium transition"
          >
            <Plus size={16} /> Add Exercise
          </button>

          {/* Action buttons */}
          {workoutExercises.length > 0 && (
            <div className="space-y-2">
              <button
                onClick={finishWorkout}
                disabled={!workoutName.trim()}
                className="w-full flex items-center justify-center gap-2 bg-teal-600 hover:bg-teal-500 disabled:opacity-40 disabled:cursor-not-allowed text-white py-3 rounded-xl text-sm font-semibold transition active:scale-[0.98]"
              >
                <Square size={16} /> Finish Workout
              </button>
              <div className="flex gap-2">
                <button
                  onClick={saveAsTemplate}
                  disabled={!workoutName.trim()}
                  className="flex-1 flex items-center justify-center gap-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-300 py-2.5 rounded-xl text-xs font-medium transition"
                >
                  <Save size={14} /> Save as Template
                </button>
                <button
                  onClick={cancelWorkout}
                  className="flex-1 flex items-center justify-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-red-400 py-2.5 rounded-xl text-xs font-medium transition"
                >
                  <X size={14} /> Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {view === "history" && (
        <div className="space-y-2">
          {workouts.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              <Dumbbell size={40} className="mx-auto mb-3 opacity-50" />
              <p className="text-sm">No workouts logged yet.</p>
              <p className="text-xs mt-1">
                Switch to &quot;New Workout&quot; to get started!
              </p>
            </div>
          ) : (
            workouts.map((w) => {
              const expanded = expandedId === w.id;
              const volume = getWorkoutVolume(w);
              const exerciseCount = w.exercises.length;
              return (
                <div key={w.id} className="bg-slate-800 rounded-xl overflow-hidden">
                  <button
                    onClick={() => setExpandedId(expanded ? null : w.id)}
                    className="w-full px-4 py-3 flex items-start justify-between text-left"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold truncate">{w.name}</p>
                        {expanded ? (
                          <ChevronUp size={16} className="text-slate-400 shrink-0" />
                        ) : (
                          <ChevronDown size={16} className="text-slate-400 shrink-0" />
                        )}
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {format(parseISO(w.date), "MMM d, yyyy")}
                      </p>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="flex items-center gap-0.5 text-xs text-slate-500">
                          <Clock size={11} /> {w.duration}m
                        </span>
                        <span className="text-xs text-slate-500">
                          {exerciseCount} exercise{exerciseCount !== 1 && "s"}
                        </span>
                        {volume > 0 && (
                          <span className="text-xs text-teal-400 font-medium">
                            {volume.toLocaleString()} kg
                          </span>
                        )}
                      </div>
                    </div>
                  </button>

                  {expanded && (
                    <div className="px-4 pb-3 space-y-2 border-t border-slate-700/50 pt-2">
                      {w.exercises.map((ex, i) => (
                        <div key={i}>
                          <p className="text-xs font-medium text-slate-300">{ex.name}</p>
                          <div className="mt-1 space-y-0.5">
                            {ex.sets.map((set, si) => (
                              <div key={si} className="flex items-center gap-2 text-[11px] text-slate-400">
                                <span className="w-4 text-slate-500">{si + 1}</span>
                                <span>{set.reps} reps</span>
                                <span>× {set.weight} kg</span>
                                {set.completed && (
                                  <Check size={11} className="text-teal-400" />
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                      <button
                        onClick={() => handleDelete(w.id)}
                        className={`flex items-center gap-1 text-xs font-medium mt-2 transition ${
                          confirmDeleteId === w.id
                            ? "text-red-400"
                            : "text-slate-500 hover:text-red-400"
                        }`}
                      >
                        <Trash2 size={12} />
                        {confirmDeleteId === w.id ? "Tap again to confirm" : "Delete workout"}
                      </button>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {view === "ai" && (
        <div className="space-y-4">
          {/* Plan viewer */}
          {viewingPlan ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <button
                  onClick={() => setViewingPlan(null)}
                  className="text-xs text-teal-400 hover:text-teal-300"
                >
                  ← All Plans
                </button>
                {!viewingPlan.isActive && (
                  <button
                    onClick={() => {
                      setActivePlan(viewingPlan.id);
                      refreshPlans();
                      setViewingPlan({ ...viewingPlan, isActive: true });
                      setToast("Plan set as active!");
                    }}
                    className="flex items-center gap-1 text-xs bg-teal-600 hover:bg-teal-500 text-white px-3 py-1.5 rounded-lg transition"
                  >
                    <Star size={12} /> Set Active
                  </button>
                )}
              </div>

              <div className="bg-slate-800 rounded-2xl p-4">
                <div className="flex items-center gap-2 mb-1">
                  <h2 className="text-sm font-bold text-white">{viewingPlan.plan_name}</h2>
                  {viewingPlan.isActive && (
                    <span className="text-[9px] bg-teal-600 text-white px-1.5 py-0.5 rounded-full font-medium">Active</span>
                  )}
                </div>
                <p className="text-xs text-slate-400">{viewingPlan.description}</p>
              </div>

              {/* Days */}
              {(["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"] as const).map((dayName) => {
                const planDay = viewingPlan.days.find(
                  (d) => d.day.toLowerCase() === dayName.toLowerCase()
                );
                const isRest = !planDay;
                const isExpanded = expandedDay === dayName;

                return (
                  <div key={dayName} className="bg-slate-800 rounded-xl overflow-hidden">
                    <button
                      onClick={() => setExpandedDay(isExpanded ? null : dayName)}
                      className="w-full px-4 py-3 flex items-center justify-between text-left"
                    >
                      <div className="flex items-center gap-2">
                        {isRest ? (
                          <Coffee size={14} className="text-slate-500" />
                        ) : (
                          <Dumbbell size={14} className="text-teal-400" />
                        )}
                        <div>
                          <p className="text-xs font-semibold text-white">{dayName}</p>
                          <p className="text-[10px] text-slate-400">
                            {isRest ? "Rest Day" : planDay.workout_name}
                          </p>
                        </div>
                      </div>
                      {!isRest && (
                        isExpanded ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />
                      )}
                    </button>

                    {isExpanded && planDay && (
                      <div className="px-4 pb-3 space-y-2 border-t border-slate-700/50 pt-2">
                        {planDay.exercises.map((ex, i) => (
                          <div key={i} className="bg-slate-700/30 rounded-lg px-3 py-2">
                            <p className="text-xs font-medium text-white">{ex.name}</p>
                            <div className="flex items-center gap-3 mt-0.5">
                              <span className="text-[10px] text-slate-400">{ex.sets} sets × {ex.reps}</span>
                              <span className="text-[10px] text-slate-500">Rest: {ex.rest_seconds}s</span>
                            </div>
                            {ex.notes && (
                              <p className="text-[10px] text-slate-500 mt-0.5 italic">{ex.notes}</p>
                            )}
                          </div>
                        ))}
                        <button
                          onClick={() => startFromPlanDay(planDay)}
                          className="w-full flex items-center justify-center gap-1.5 bg-teal-600 hover:bg-teal-500 text-white py-2.5 rounded-xl text-xs font-semibold transition mt-2"
                        >
                          <Play size={14} /> Start This Workout
                        </button>
                      </div>
                    )}

                    {isExpanded && isRest && (
                      <div className="px-4 pb-3 border-t border-slate-700/50 pt-2">
                        <p className="text-[10px] text-slate-500">
                          Focus on recovery: sleep, hydration, light stretching, or a walk.
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Progression notes */}
              {viewingPlan.progression_notes && (
                <div className="bg-slate-800 rounded-xl p-3">
                  <p className="text-[10px] text-slate-400 font-semibold mb-1">Progression</p>
                  <p className="text-xs text-slate-300">{viewingPlan.progression_notes}</p>
                </div>
              )}

              {/* Delete plan */}
              <button
                onClick={() => {
                  deleteTrainingPlan(viewingPlan.id);
                  refreshPlans();
                  setViewingPlan(null);
                  setToast("Plan deleted");
                }}
                className="w-full flex items-center justify-center gap-1.5 text-xs text-slate-500 hover:text-red-400 py-2 transition"
              >
                <Trash2 size={12} /> Delete Plan
              </button>
            </div>
          ) : (
            <>
              {/* Saved plans list */}
              {plans.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs text-slate-400 font-medium">Your Plans</p>
                  {plans.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => { setViewingPlan(p); setExpandedDay(null); }}
                      className="w-full bg-slate-800 rounded-xl px-4 py-3 text-left hover:bg-slate-700/80 transition"
                    >
                      <div className="flex items-center gap-2">
                        <Calendar size={14} className="text-teal-400 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-xs font-semibold text-white truncate">{p.plan_name}</p>
                            {p.isActive && (
                              <span className="text-[8px] bg-teal-600 text-white px-1.5 py-0.5 rounded-full font-medium shrink-0">Active</span>
                            )}
                          </div>
                          <p className="text-[10px] text-slate-400 truncate">{p.description}</p>
                          <p className="text-[10px] text-slate-500">{p.days.length} days/week</p>
                        </div>
                        <ChevronDown size={14} className="text-slate-500 -rotate-90 shrink-0" />
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {/* Generator form */}
              <div className="bg-slate-800 rounded-2xl p-4 space-y-3">
                <div className="flex items-center gap-2 mb-1">
                  <Sparkles size={14} className="text-violet-400" />
                  <p className="text-xs font-semibold text-white">Generate AI Plan</p>
                </div>

                <div>
                  <label className="text-[10px] text-slate-400 font-medium">Goal</label>
                  <div className="grid grid-cols-2 gap-1.5 mt-1">
                    {["Build Muscle", "Lose Fat", "General Fitness", "Strength"].map((g) => (
                      <button
                        key={g}
                        onClick={() => setAiGoal(g)}
                        className={`py-2 rounded-lg text-xs font-medium transition ${
                          aiGoal === g ? "bg-teal-600 text-white" : "bg-slate-700 text-slate-400"
                        }`}
                      >
                        {g}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-[10px] text-slate-400 font-medium">Experience Level</label>
                  <div className="grid grid-cols-3 gap-1.5 mt-1">
                    {["Beginner", "Intermediate", "Advanced"].map((l) => (
                      <button
                        key={l}
                        onClick={() => setAiLevel(l)}
                        className={`py-2 rounded-lg text-xs font-medium transition ${
                          aiLevel === l ? "bg-teal-600 text-white" : "bg-slate-700 text-slate-400"
                        }`}
                      >
                        {l}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-[10px] text-slate-400 font-medium">Days Per Week</label>
                  <div className="grid grid-cols-5 gap-1.5 mt-1">
                    {["2", "3", "4", "5", "6"].map((d) => (
                      <button
                        key={d}
                        onClick={() => setAiDays(d)}
                        className={`py-2 rounded-lg text-xs font-medium transition ${
                          aiDays === d ? "bg-teal-600 text-white" : "bg-slate-700 text-slate-400"
                        }`}
                      >
                        {d}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-[10px] text-slate-400 font-medium">Equipment</label>
                  <div className="grid grid-cols-3 gap-1.5 mt-1">
                    {["Full Gym", "Home Gym", "Bodyweight"].map((eq) => (
                      <button
                        key={eq}
                        onClick={() => setAiEquipment(eq)}
                        className={`py-2 rounded-lg text-[10px] font-medium transition ${
                          aiEquipment === eq ? "bg-teal-600 text-white" : "bg-slate-700 text-slate-400"
                        }`}
                      >
                        {eq}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-[10px] text-slate-400 font-medium">Session Duration</label>
                  <div className="grid grid-cols-4 gap-1.5 mt-1">
                    {["30 min", "45 min", "60 min", "90 min"].map((t) => (
                      <button
                        key={t}
                        onClick={() => setAiDuration(t)}
                        className={`py-2 rounded-lg text-xs font-medium transition ${
                          aiDuration === t ? "bg-teal-600 text-white" : "bg-slate-700 text-slate-400"
                        }`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-[10px] text-slate-400 font-medium">Injuries / Limitations (optional)</label>
                  <textarea
                    value={aiInjuries}
                    onChange={(e) => setAiInjuries(e.target.value)}
                    placeholder="e.g., lower back pain, shoulder impingement..."
                    rows={2}
                    className="w-full mt-1 bg-slate-700 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 outline-none focus:ring-2 focus:ring-violet-500 resize-none"
                  />
                </div>

                {aiError && (
                  <p className="text-xs text-red-400">{aiError}</p>
                )}

                <button
                  onClick={generatePlan}
                  disabled={aiLoading}
                  className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-violet-600 to-teal-600 hover:from-violet-500 hover:to-teal-500 disabled:opacity-50 text-white py-3 rounded-xl text-sm font-semibold transition"
                >
                  {aiLoading ? (
                    <>
                      <Loader2 size={16} className="animate-spin" /> Generating...
                    </>
                  ) : (
                    <>
                      <Sparkles size={16} /> Generate Plan
                    </>
                  )}
                </button>

                <p className="text-[10px] text-slate-500 text-center">
                  AI plans are suggestions — adjust based on how you feel
                </p>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
