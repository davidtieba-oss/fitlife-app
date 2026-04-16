"use client";

import { useState } from "react";
import { Dumbbell, ChevronRight, Target, Utensils } from "lucide-react";
import { PROFILE_COLORS, saveProfile, saveSettings, type WeightGoal } from "@/lib/storage";
import { useProfile } from "@/lib/ProfileContext";

const GOAL_OPTIONS: { value: WeightGoal; label: string; cal: number }[] = [
  { value: "lose", label: "Lose Weight", cal: 1700 },
  { value: "maintain", label: "Maintain", cal: 2000 },
  { value: "gain", label: "Gain Weight", cal: 2300 },
];

export default function Onboarding() {
  const { completeOnboarding } = useProfile();
  const [step, setStep] = useState(1);

  // Step 1
  const [name, setName] = useState("");
  const [color, setColor] = useState(PROFILE_COLORS[0]);
  const [age, setAge] = useState("");
  const [height, setHeight] = useState("");
  const [gender, setGender] = useState("");

  // Step 2
  const [weightGoal, setWeightGoal] = useState<WeightGoal>("maintain");
  const [targetWeight, setTargetWeight] = useState("");

  // Step 3
  const [calorieTarget, setCalorieTarget] = useState(2000);
  const [proteinPct, setProteinPct] = useState(30);
  const [carbsPct, setCarbsPct] = useState(40);
  const [fatPct, setFatPct] = useState(30);

  function handleGoalChange(goal: WeightGoal) {
    setWeightGoal(goal);
    const opt = GOAL_OPTIONS.find((o) => o.value === goal);
    if (opt) setCalorieTarget(opt.cal);
  }

  function finish() {
    const trimmed = name.trim() || "User";
    const profile = saveProfile({ name: trimmed, color });
    saveSettings({
      waterGoal: 8,
      calorieTarget,
      name: trimmed,
      proteinPct,
      carbsPct,
      fatPct,
      weightGoal,
      age: age ? parseInt(age) : undefined,
      height: height ? parseInt(height) : undefined,
      gender: gender || undefined,
      targetWeight: targetWeight ? parseFloat(targetWeight) : undefined,
    });
    completeOnboarding(profile.id);
  }

  function skip() {
    if (step < 3) {
      setStep(step + 1);
    } else {
      finish();
    }
  }

  function next() {
    if (step < 3) {
      setStep(step + 1);
    } else {
      finish();
    }
  }

  return (
    <div className="fixed inset-0 z-[100] bg-white dark:bg-slate-950 flex items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-6">
        {/* Step indicator */}
        <div className="flex items-center justify-center gap-2">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className={`h-1.5 rounded-full transition-all ${
                s === step
                  ? "w-8 bg-teal-500"
                  : s < step
                  ? "w-4 bg-teal-500/50"
                  : "w-4 bg-gray-200 dark:bg-slate-700"
              }`}
            />
          ))}
        </div>

        {step === 1 && (
          <div className="space-y-6">
            <div className="text-center space-y-3">
              <div className="w-16 h-16 bg-teal-600 rounded-2xl flex items-center justify-center mx-auto">
                <Dumbbell size={32} className="text-white" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Welcome to <span className="text-teal-500 dark:text-teal-400">FitLife</span>
              </h1>
              <p className="text-sm text-gray-500 dark:text-slate-400">
                Let&apos;s get to know you.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs text-gray-500 dark:text-slate-400 font-medium block mb-1.5">Your Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter your name"
                  autoFocus
                  className="w-full bg-gray-100 dark:bg-slate-800 rounded-xl px-4 py-3 text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-slate-500 outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div>
                <label className="text-xs text-gray-500 dark:text-slate-400 font-medium block mb-2">Pick a Color</label>
                <div className="flex gap-3 justify-center">
                  {PROFILE_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setColor(c)}
                      className={`w-10 h-10 rounded-full transition-all ${
                        color === c
                          ? "ring-2 ring-teal-500 ring-offset-2 ring-offset-white dark:ring-offset-slate-950 scale-110"
                          : "opacity-60 hover:opacity-100"
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-xs text-gray-500 dark:text-slate-400 font-medium block mb-1.5">Age</label>
                  <input
                    type="number"
                    value={age}
                    onChange={(e) => setAge(e.target.value)}
                    placeholder="25"
                    inputMode="numeric"
                    className="w-full bg-gray-100 dark:bg-slate-800 rounded-xl px-3 py-3 text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-slate-500 outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500 dark:text-slate-400 font-medium block mb-1.5">Height (cm)</label>
                  <input
                    type="number"
                    value={height}
                    onChange={(e) => setHeight(e.target.value)}
                    placeholder="175"
                    inputMode="numeric"
                    className="w-full bg-gray-100 dark:bg-slate-800 rounded-xl px-3 py-3 text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-slate-500 outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500 dark:text-slate-400 font-medium block mb-1.5">Gender</label>
                  <select
                    value={gender}
                    onChange={(e) => setGender(e.target.value)}
                    className="w-full bg-gray-100 dark:bg-slate-800 rounded-xl px-2 py-3 text-sm text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-teal-500"
                  >
                    <option value="">—</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6">
            <div className="text-center space-y-3">
              <div className="w-16 h-16 bg-violet-600 rounded-2xl flex items-center justify-center mx-auto">
                <Target size={32} className="text-white" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Set Your Goals</h2>
              <p className="text-sm text-gray-500 dark:text-slate-400">What are you working towards?</p>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-2">
                {GOAL_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => handleGoalChange(opt.value)}
                    className={`py-3 px-2 rounded-xl text-center transition ${
                      weightGoal === opt.value
                        ? "bg-teal-600 text-white"
                        : "bg-gray-100 dark:bg-slate-800 text-gray-500 dark:text-slate-400"
                    }`}
                  >
                    <p className="text-xs font-semibold">{opt.label}</p>
                    <p className="text-[10px] mt-0.5 opacity-70">{opt.cal} cal</p>
                  </button>
                ))}
              </div>

              <div>
                <label className="text-xs text-gray-500 dark:text-slate-400 font-medium block mb-1.5">
                  Target Weight (kg) — optional
                </label>
                <input
                  type="number"
                  value={targetWeight}
                  onChange={(e) => setTargetWeight(e.target.value)}
                  placeholder="70"
                  step="0.1"
                  inputMode="decimal"
                  className="w-full bg-gray-100 dark:bg-slate-800 rounded-xl px-4 py-3 text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-slate-500 outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-6">
            <div className="text-center space-y-3">
              <div className="w-16 h-16 bg-cyan-600 rounded-2xl flex items-center justify-center mx-auto">
                <Utensils size={32} className="text-white" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Nutrition Targets</h2>
              <p className="text-sm text-gray-500 dark:text-slate-400">Customize or accept smart defaults.</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs text-gray-500 dark:text-slate-400 font-medium block mb-1.5">
                  Daily Calorie Target
                </label>
                <input
                  type="number"
                  value={calorieTarget}
                  onChange={(e) => setCalorieTarget(parseInt(e.target.value) || 1000)}
                  min={500}
                  max={10000}
                  step={50}
                  inputMode="numeric"
                  className="w-full bg-gray-100 dark:bg-slate-800 rounded-xl px-4 py-3 text-sm text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div>
                <label className="text-xs text-gray-500 dark:text-slate-400 font-medium block mb-2">
                  Macro Split
                </label>
                <div className="grid grid-cols-3 gap-3">
                  <div className="text-center">
                    <div className="w-10 h-10 rounded-full bg-teal-500/20 flex items-center justify-center mx-auto mb-1">
                      <span className="text-xs font-bold text-teal-500">{proteinPct}%</span>
                    </div>
                    <span className="text-[10px] text-gray-600 dark:text-slate-300">Protein</span>
                    <input
                      type="range"
                      min={10}
                      max={60}
                      value={proteinPct}
                      onChange={(e) => {
                        const v = parseInt(e.target.value);
                        setProteinPct(v);
                        const remaining = 100 - v;
                        setCarbsPct(Math.round(remaining * 0.57));
                        setFatPct(100 - v - Math.round(remaining * 0.57));
                      }}
                      className="w-full mt-1"
                    />
                  </div>
                  <div className="text-center">
                    <div className="w-10 h-10 rounded-full bg-cyan-500/20 flex items-center justify-center mx-auto mb-1">
                      <span className="text-xs font-bold text-cyan-500">{carbsPct}%</span>
                    </div>
                    <span className="text-[10px] text-gray-600 dark:text-slate-300">Carbs</span>
                    <input
                      type="range"
                      min={10}
                      max={60}
                      value={carbsPct}
                      onChange={(e) => {
                        const v = parseInt(e.target.value);
                        setCarbsPct(v);
                        const remaining = 100 - v;
                        setProteinPct(Math.round(remaining * 0.5));
                        setFatPct(100 - v - Math.round(remaining * 0.5));
                      }}
                      className="w-full mt-1"
                    />
                  </div>
                  <div className="text-center">
                    <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center mx-auto mb-1">
                      <span className="text-xs font-bold text-amber-500">{fatPct}%</span>
                    </div>
                    <span className="text-[10px] text-gray-600 dark:text-slate-300">Fat</span>
                    <input
                      type="range"
                      min={10}
                      max={60}
                      value={fatPct}
                      onChange={(e) => {
                        const v = parseInt(e.target.value);
                        setFatPct(v);
                        const remaining = 100 - v;
                        setProteinPct(Math.round(remaining * 0.43));
                        setCarbsPct(100 - v - Math.round(remaining * 0.43));
                      }}
                      className="w-full mt-1"
                    />
                  </div>
                </div>
                <p className="text-[10px] text-gray-400 dark:text-slate-500 text-center mt-2">
                  Total: {proteinPct + carbsPct + fatPct}%
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="flex gap-2">
          <button
            onClick={skip}
            className="flex-1 bg-gray-100 dark:bg-slate-800 text-gray-500 dark:text-slate-400 py-3 rounded-xl text-sm font-medium transition hover:bg-gray-200 dark:hover:bg-slate-700"
          >
            Skip
          </button>
          <button
            onClick={next}
            className="flex-[2] flex items-center justify-center gap-2 bg-teal-600 hover:bg-teal-500 text-white py-3 rounded-xl text-sm font-semibold transition active:scale-[0.98]"
          >
            {step === 3 ? "Get Started" : "Next"}
            {step < 3 && <ChevronRight size={16} />}
          </button>
        </div>
      </div>
    </div>
  );
}
