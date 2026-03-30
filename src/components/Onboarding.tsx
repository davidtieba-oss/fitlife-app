"use client";

import { useState } from "react";
import { Dumbbell } from "lucide-react";
import { PROFILE_COLORS, saveProfile } from "@/lib/storage";
import { useProfile } from "@/lib/ProfileContext";

export default function Onboarding() {
  const { completeOnboarding } = useProfile();
  const [name, setName] = useState("");
  const [color, setColor] = useState(PROFILE_COLORS[0]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim() || "User";
    const profile = saveProfile({ name: trimmed, color });
    completeOnboarding(profile.id);
  }

  return (
    <div className="fixed inset-0 z-[100] bg-slate-950 flex items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center space-y-3">
          <div className="w-16 h-16 bg-teal-600 rounded-2xl flex items-center justify-center mx-auto">
            <Dumbbell size={32} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">
            Welcome to <span className="text-teal-400">FitLife</span>
          </h1>
          <p className="text-sm text-slate-400">
            Your personal health & fitness tracker.
            <br />
            Let&apos;s set up your profile.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="text-xs text-slate-400 font-medium block mb-1.5">
              Your Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter your name"
              autoFocus
              className="w-full bg-slate-800 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>

          <div>
            <label className="text-xs text-slate-400 font-medium block mb-2">
              Pick a Color
            </label>
            <div className="flex gap-3 justify-center">
              {PROFILE_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`w-10 h-10 rounded-full transition-all ${
                    color === c
                      ? "ring-2 ring-white ring-offset-2 ring-offset-slate-950 scale-110"
                      : "opacity-60 hover:opacity-100"
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

          <button
            type="submit"
            className="w-full bg-teal-600 hover:bg-teal-500 text-white py-3 rounded-xl text-sm font-semibold transition active:scale-[0.98]"
          >
            Get Started
          </button>
        </form>
      </div>
    </div>
  );
}
