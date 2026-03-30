"use client";

import { useState, useEffect } from "react";
import { getSettings, saveSettings, type UserSettings } from "@/lib/storage";
import Toast from "@/components/Toast";

export default function SettingsPage() {
  const [mounted, setMounted] = useState(false);
  const [settings, setSettings] = useState<UserSettings>({
    waterGoal: 8,
    calorieTarget: 2000,
    name: "User",
  });
  const [toast, setToast] = useState("");

  useEffect(() => {
    setMounted(true);
    setSettings(getSettings());
  }, []);

  if (!mounted) {
    return <div className="h-screen flex items-center justify-center text-slate-500">Loading...</div>;
  }

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    saveSettings(settings);
    setToast("Settings saved!");
  }

  return (
    <div className="space-y-4">
      {toast && <Toast message={toast} onClose={() => setToast("")} />}

      <h1 className="text-xl font-bold">Settings</h1>

      <form onSubmit={handleSave} className="bg-slate-800 rounded-2xl p-4 space-y-4">
        <div>
          <label className="text-xs text-slate-400 font-medium">Display Name</label>
          <input
            type="text"
            value={settings.name}
            onChange={(e) => setSettings({ ...settings, name: e.target.value })}
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
              setSettings({ ...settings, waterGoal: parseInt(e.target.value) || 1 })
            }
            min={1}
            max={20}
            className="w-full mt-1 bg-slate-700 rounded-lg px-3 py-2.5 text-sm text-white outline-none focus:ring-2 focus:ring-teal-500"
          />
          <p className="text-xs text-slate-500 mt-1">
            1 glass = 250ml
          </p>
        </div>
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
