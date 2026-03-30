"use client";

import { useState, useEffect, useCallback } from "react";
import { format, parseISO } from "date-fns";
import { Plus, Trash2, Clock, Dumbbell } from "lucide-react";
import {
  getWorkouts,
  saveWorkout,
  deleteWorkout,
  type WorkoutEntry,
} from "@/lib/storage";
import Toast from "@/components/Toast";

export default function WorkoutsPage() {
  const [mounted, setMounted] = useState(false);
  const [workouts, setWorkouts] = useState<WorkoutEntry[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [duration, setDuration] = useState("");
  const [exercises, setExercises] = useState("");
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [toast, setToast] = useState("");

  const refresh = useCallback(() => setWorkouts(getWorkouts()), []);

  useEffect(() => {
    setMounted(true);
    refresh();
  }, [refresh]);

  if (!mounted) {
    return <div className="h-screen flex items-center justify-center text-slate-500">Loading...</div>;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name || !duration) return;
    saveWorkout({
      date,
      name,
      duration: parseInt(duration),
      exercises: exercises
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
    });
    setName("");
    setDuration("");
    setExercises("");
    setShowForm(false);
    setToast("Workout saved!");
    refresh();
  }

  function handleDelete(id: string) {
    deleteWorkout(id);
    refresh();
  }

  return (
    <div className="space-y-4">
      {toast && <Toast message={toast} onClose={() => setToast("")} />}

      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Workouts</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-1 bg-teal-600 hover:bg-teal-500 text-white px-3 py-1.5 rounded-lg text-sm font-medium transition"
        >
          <Plus size={16} /> New
        </button>
      </div>

      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="bg-slate-800 rounded-2xl p-4 space-y-3"
        >
          <div>
            <label className="text-xs text-slate-400 font-medium">Date</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full mt-1 bg-slate-700 rounded-lg px-3 py-2.5 text-sm text-white outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>
          <div>
            <label className="text-xs text-slate-400 font-medium">Workout Name *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Upper Body Push"
              className="w-full mt-1 bg-slate-700 rounded-lg px-3 py-2.5 text-sm text-white outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>
          <div>
            <label className="text-xs text-slate-400 font-medium">Duration (min) *</label>
            <input
              type="number"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              placeholder="45"
              className="w-full mt-1 bg-slate-700 rounded-lg px-3 py-2.5 text-sm text-white outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>
          <div>
            <label className="text-xs text-slate-400 font-medium">Exercises (comma-separated)</label>
            <input
              type="text"
              value={exercises}
              onChange={(e) => setExercises(e.target.value)}
              placeholder="Bench Press, OHP, Dips"
              className="w-full mt-1 bg-slate-700 rounded-lg px-3 py-2.5 text-sm text-white outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              className="flex-1 bg-teal-600 hover:bg-teal-500 text-white py-2.5 rounded-xl text-sm font-semibold transition"
            >
              Save Workout
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="px-4 bg-slate-700 hover:bg-slate-600 text-white py-2.5 rounded-xl text-sm transition"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {workouts.length === 0 ? (
        <div className="text-center py-12 text-slate-500">
          <Dumbbell size={40} className="mx-auto mb-3 opacity-50" />
          <p className="text-sm">No workouts logged yet.</p>
          <p className="text-xs mt-1">Tap &quot;New&quot; to add your first workout!</p>
        </div>
      ) : (
        <div className="space-y-2">
          {workouts.map((w) => (
            <div
              key={w.id}
              className="bg-slate-800 rounded-xl px-4 py-3 flex items-start justify-between"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold truncate">{w.name}</p>
                  <span className="flex items-center gap-0.5 text-xs text-slate-400 shrink-0">
                    <Clock size={12} /> {w.duration}m
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  {format(parseISO(w.date), "MMM d, yyyy")}
                </p>
                {w.exercises.length > 0 && (
                  <p className="text-xs text-slate-500 mt-1 truncate">
                    {w.exercises.join(" · ")}
                  </p>
                )}
              </div>
              <button
                onClick={() => handleDelete(w.id)}
                className="text-slate-500 hover:text-red-400 p-1 transition ml-2"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
