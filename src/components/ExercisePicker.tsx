"use client";

import { useState } from "react";
import { Search, X, Plus } from "lucide-react";
import { exercises, MUSCLE_GROUPS, type MuscleGroup, type Exercise } from "@/data/exercises";

interface Props {
  onSelect: (exercise: Exercise) => void;
  onClose: () => void;
  excludeIds?: string[];
}

export default function ExercisePicker({ onSelect, onClose, excludeIds = [] }: Props) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<MuscleGroup | "All">("All");

  const filtered = exercises.filter((ex) => {
    if (excludeIds.includes(ex.id)) return false;
    if (filter !== "All" && ex.muscleGroup !== filter) return false;
    if (search && !ex.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="fixed inset-0 z-[80] bg-white/95 dark:bg-slate-950/95 flex flex-col">
      <div className="max-w-lg mx-auto w-full flex flex-col h-full px-4 pt-4 pb-20">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">Add Exercise</h2>
          <button onClick={onClose} className="text-gray-400 dark:text-slate-400 hover:text-gray-700 dark:hover:text-white p-1">
            <X size={20} />
          </button>
        </div>

        {/* Search */}
        <div className="relative mb-3">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search exercises..."
            autoFocus
            className="w-full bg-gray-100 dark:bg-slate-800 rounded-lg pl-9 pr-3 py-2.5 text-sm text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-teal-500"
          />
        </div>

        {/* Muscle group filter */}
        <div className="flex gap-1.5 overflow-x-auto pb-2 mb-2 no-scrollbar">
          <button
            onClick={() => setFilter("All")}
            className={`shrink-0 px-3 py-1 rounded-full text-xs font-medium transition ${
              filter === "All" ? "bg-teal-600 text-white" : "bg-gray-100 dark:bg-slate-800 text-gray-500 dark:text-slate-400"
            }`}
          >
            All
          </button>
          {MUSCLE_GROUPS.map((mg) => (
            <button
              key={mg}
              onClick={() => setFilter(mg)}
              className={`shrink-0 px-3 py-1 rounded-full text-xs font-medium transition ${
                filter === mg ? "bg-teal-600 text-white" : "bg-gray-100 dark:bg-slate-800 text-gray-500 dark:text-slate-400"
              }`}
            >
              {mg}
            </button>
          ))}
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto space-y-1">
          {filtered.length === 0 ? (
            <p className="text-sm text-gray-400 dark:text-slate-500 text-center py-8">No exercises found.</p>
          ) : (
            filtered.map((ex) => (
              <button
                key={ex.id}
                onClick={() => {
                  onSelect(ex);
                  onClose();
                }}
                className="w-full flex items-center justify-between bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 rounded-xl px-4 py-3 transition text-left"
              >
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{ex.name}</p>
                  <p className="text-xs text-gray-500 dark:text-slate-400">
                    {ex.muscleGroup}
                    {ex.equipment && ` · ${ex.equipment}`}
                    {ex.isCompound && " · Compound"}
                  </p>
                </div>
                <Plus size={18} className="text-teal-400 shrink-0" />
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
