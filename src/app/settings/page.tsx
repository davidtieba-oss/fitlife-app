"use client";

import { useState, useEffect } from "react";
import {
  getSettings,
  saveSettings,
  getMacroTargets,
  getSuggestedCalories,
  type UserSettings,
  type WeightGoal,
} from "@/lib/storage";
import Toast from "@/components/Toast";

const GOAL_OPTIONS: { value: WeightGoal; label: string; desc: string }[] = [
  { value: "lose", label: "Lose Weight", desc: "-300 cal/day" },
  { value: "maintain", label: "Maintain", desc: "No adjustment" },
  { value: "gain", label: "Gain Weight", desc: "+300 cal/day" },
];

export default function SettingsPage() {
  const [mounted, setMounted] = useState(false);
  const [settings, setSettings] = useState<UserSettings>({
    waterGoal: 8,
    calorieTarget: 2000,
    name: "User",
    proteinPct: 30,
    carbsPct: 40,
    fatPct: 30,
    weightGoal: "maintain",
  });
  const [toast, setToast] = useState("");

  useEffect(() => {
    setMounted(true);
    setSettings(getSettings());
  }, []);

  if (!mounted) {
    return (
      <div className="h-screen flex items-center justify-center text-slate-500">
        Loading...
      </div>
    );
  }

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    saveSettings(settings);
    setToast("Settings saved!");
  }

  function updateMacroPct(field: "proteinPct" | "carbsPct" | "fatPct", value: number) {
    const next = { ...settings, [field]: value };
    // Auto-adjust: keep total at 100 by adjusting the last changed field
    const total = next.proteinPct + next.carbsPct + next.fatPct;
    if (total !== 100) {
      // Adjust the "other" macro that wasn't just changed
      if (field === "proteinPct") {
        const remaining = 100 - next.proteinPct;
        const ratio =
          next.carbsPct + next.fatPct > 0
            ? remaining / (next.carbsPct + next.fatPct)
            : 0.5;
        next.carbsPct = Math.round(next.carbsPct * ratio);
        next.fatPct = 100 - next.proteinPct - next.carbsPct;
      } else if (field === "carbsPct") {
        const remaining = 100 - next.carbsPct;
        const ratio =
          next.proteinPct + next.fatPct > 0
            ? remaining / (next.proteinPct + next.fatPct)
            : 0.5;
        next.proteinPct = Math.round(next.proteinPct * ratio);
        next.fatPct = 100 - next.proteinPct - next.carbsPct;
      } else {
        const remaining = 100 - next.fatPct;
        const ratio =
          next.proteinPct + next.carbsPct > 0
            ? remaining / (next.proteinPct + next.carbsPct)
            : 0.5;
        next.proteinPct = Math.round(next.proteinPct * ratio);
        next.carbsPct = 100 - next.proteinPct - next.fatPct;
      }
    }
    setSettings(next);
  }

  const macros = getMacroTargets(settings);
  const suggestedCals = getSuggestedCalories(2000, settings.weightGoal);

  return (
    <div className="space-y-4">
      {toast && <Toast message={toast} onClose={() => setToast("")} />}

      <h1 className="text-xl font-bold">Settings</h1>

      <form onSubmit={handleSave} className="space-y-4">
        {/* Profile */}
        <div className="bg-slate-800 rounded-2xl p-4 space-y-4">
          <h2 className="text-sm font-semibold text-slate-300">Profile</h2>
          <div>
            <label className="text-xs text-slate-400 font-medium">
              Display Name
            </label>
            <input
              type="text"
              value={settings.name}
              onChange={(e) =>
                setSettings({ ...settings, name: e.target.value })
              }
              className="w-full mt-1 bg-slate-700 rounded-lg px-3 py-2.5 text-sm text-white outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>
          <div>
            <label className="text-xs text-slate-400 font-medium">
              Daily Water Goal (glasses)
            </label>
            <input
              type="number"
              value={settings.waterGoal}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  waterGoal: parseInt(e.target.value) || 1,
                })
              }
              min={1}
              max={20}
              className="w-full mt-1 bg-slate-700 rounded-lg px-3 py-2.5 text-sm text-white outline-none focus:ring-2 focus:ring-teal-500"
            />
            <p className="text-xs text-slate-500 mt-1">1 glass = 250ml</p>
          </div>
        </div>

        {/* Nutrition Targets */}
        <div className="bg-slate-800 rounded-2xl p-4 space-y-4">
          <h2 className="text-sm font-semibold text-slate-300">
            Nutrition Targets
          </h2>

          {/* Weight goal */}
          <div>
            <label className="text-xs text-slate-400 font-medium mb-2 block">
              Weight Goal
            </label>
            <div className="grid grid-cols-3 gap-1.5">
              {GOAL_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() =>
                    setSettings({ ...settings, weightGoal: opt.value })
                  }
                  className={`py-2 px-2 rounded-lg text-center transition ${
                    settings.weightGoal === opt.value
                      ? "bg-teal-600 text-white"
                      : "bg-slate-700 text-slate-400"
                  }`}
                >
                  <p className="text-xs font-medium">{opt.label}</p>
                  <p className="text-[10px] text-slate-300/60 mt-0.5">
                    {opt.desc}
                  </p>
                </button>
              ))}
            </div>
            <p className="text-[10px] text-slate-500 mt-1.5">
              Suggested: {suggestedCals} cal/day for{" "}
              {settings.weightGoal === "lose"
                ? "weight loss"
                : settings.weightGoal === "gain"
                ? "weight gain"
                : "maintenance"}
            </p>
          </div>

          {/* Calorie target */}
          <div>
            <label className="text-xs text-slate-400 font-medium">
              Daily Calorie Target
            </label>
            <input
              type="number"
              value={settings.calorieTarget}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  calorieTarget: parseInt(e.target.value) || 1000,
                })
              }
              min={500}
              max={10000}
              className="w-full mt-1 bg-slate-700 rounded-lg px-3 py-2.5 text-sm text-white outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>

          {/* Macro split */}
          <div>
            <label className="text-xs text-slate-400 font-medium mb-2 block">
              Macro Split
            </label>
            <div className="space-y-3">
              <MacroSlider
                label="Protein"
                pct={settings.proteinPct}
                grams={macros.protein}
                color="bg-teal-500"
                onChange={(v) => updateMacroPct("proteinPct", v)}
              />
              <MacroSlider
                label="Carbs"
                pct={settings.carbsPct}
                grams={macros.carbs}
                color="bg-cyan-500"
                onChange={(v) => updateMacroPct("carbsPct", v)}
              />
              <MacroSlider
                label="Fat"
                pct={settings.fatPct}
                grams={macros.fat}
                color="bg-amber-500"
                onChange={(v) => updateMacroPct("fatPct", v)}
              />
            </div>
            <p className="text-[10px] text-slate-500 mt-2">
              Total: {settings.proteinPct + settings.carbsPct + settings.fatPct}
              % — Adjusts automatically to 100%
            </p>
          </div>
        </div>

        <button
          type="submit"
          className="w-full bg-teal-600 hover:bg-teal-500 text-white py-2.5 rounded-xl text-sm font-semibold transition active:scale-[0.98]"
        >
          Save Settings
        </button>
      </form>

      <div className="bg-slate-800 rounded-2xl p-4">
        <h2 className="text-sm font-semibold text-slate-300 mb-2">About</h2>
        <p className="text-xs text-slate-400 leading-relaxed">
          FitLife v1.0 — Your personal health and fitness tracker. Data is stored
          locally on your device.
        </p>
      </div>
    </div>
  );
}

function MacroSlider({
  label,
  pct,
  grams,
  color,
  onChange,
}: {
  label: string;
  pct: number;
  grams: number;
  color: string;
  onChange: (value: number) => void;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-slate-300">{label}</span>
        <span className="text-xs text-slate-400">
          {pct}% · {grams}g
        </span>
      </div>
      <input
        type="range"
        min={5}
        max={70}
        value={pct}
        onChange={(e) => onChange(parseInt(e.target.value))}
        className="w-full h-1.5 rounded-full appearance-none cursor-pointer bg-slate-700
          [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:shadow-md
          [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-white [&::-moz-range-thumb]:border-0"
      />
      <div className="h-1 bg-slate-700 rounded-full -mt-2.5 mb-2 pointer-events-none overflow-hidden">
        <div
          className={`h-full ${color} rounded-full transition-all`}
          style={{ width: `${(pct / 70) * 100}%` }}
        />
      </div>
    </div>
  );
}
