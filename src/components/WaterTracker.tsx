"use client";

import { useState, useEffect } from "react";
import { Plus, Minus } from "lucide-react";
import { getWater, setWater, getSettings } from "@/lib/storage";
import { format } from "date-fns";

export default function WaterTracker() {
  const [glasses, setGlasses] = useState(0);
  const [goal, setGoal] = useState(8);
  const [animating, setAnimating] = useState(false);
  const today = format(new Date(), "yyyy-MM-dd");

  useEffect(() => {
    setGlasses(getWater(today));
    setGoal(getSettings().waterGoal);
  }, [today]);

  function update(delta: number) {
    const next = Math.max(0, glasses + delta);
    setGlasses(next);
    setWater(today, next);
    if (delta > 0) {
      setAnimating(true);
      setTimeout(() => setAnimating(false), 600);
    }
  }

  const pct = Math.min(glasses / goal, 1);
  const circumference = 2 * Math.PI * 40;
  const offset = circumference * (1 - pct);

  return (
    <div className="bg-slate-800 rounded-2xl p-4 flex flex-col items-center">
      <p className="text-xs text-slate-400 mb-2 font-medium">Water Intake</p>
      <div className="relative w-24 h-24 mb-2">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 96 96">
          <circle
            cx="48"
            cy="48"
            r="40"
            fill="none"
            stroke="#334155"
            strokeWidth="6"
          />
          <circle
            cx="48"
            cy="48"
            r="40"
            fill="none"
            stroke="#06b6d4"
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            className={`transition-all duration-500 ${
              animating ? "drop-shadow-[0_0_8px_#06b6d4]" : ""
            }`}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={`text-lg font-bold text-white transition-transform duration-300 ${animating ? "scale-125" : ""}`}>
            {glasses}
          </span>
          <span className="text-[10px] text-slate-400">/ {goal}</span>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <button
          onClick={() => update(-1)}
          className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-slate-300 hover:bg-slate-600 active:scale-95 transition"
        >
          <Minus size={16} />
        </button>
        <span className="text-xs text-slate-400">{glasses * 250}ml</span>
        <button
          onClick={() => update(1)}
          className="w-8 h-8 rounded-full bg-cyan-600 flex items-center justify-center text-white hover:bg-cyan-500 active:scale-95 transition"
        >
          <Plus size={16} />
        </button>
      </div>
    </div>
  );
}
