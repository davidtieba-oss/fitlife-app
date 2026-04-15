"use client";

import { useState, useEffect, useRef } from "react";
import {
  getSettings,
  saveSettings,
  getMacroTargets,
  getSuggestedCalories,
  getProfiles,
  saveProfile,
  updateProfile,
  deleteProfile,
  exportProfileData,
  importProfileData,
  clearProfileData,
  PROFILE_COLORS,
  getReminders,
  saveReminders,
  type UserSettings,
  type WeightGoal,
  type Profile,
  type ReminderSettings,
} from "@/lib/storage";
import { useProfile } from "@/lib/ProfileContext";
import { useTheme } from "@/lib/ThemeProvider";
import Toast from "@/components/Toast";
import { SettingsSkeleton } from "@/components/Skeleton";
import AISettings from "@/components/AISettings";
import {
  Trash2,
  Plus,
  Download,
  Upload,
  AlertTriangle,
  Check,
  X,
  Sun,
  Moon,
  Monitor,
  Bell,
  Scale,
  Utensils,
  Dumbbell,
  Droplets,
} from "lucide-react";

const GOAL_OPTIONS: { value: WeightGoal; label: string; desc: string }[] = [
  { value: "lose", label: "Lose Weight", desc: "-300 cal/day" },
  { value: "maintain", label: "Maintain", desc: "No adjustment" },
  { value: "gain", label: "Gain Weight", desc: "+300 cal/day" },
];

const THEME_OPTIONS = [
  { value: "system" as const, label: "System", icon: Monitor },
  { value: "dark" as const, label: "Dark", icon: Moon },
  { value: "light" as const, label: "Light", icon: Sun },
];

export default function SettingsPage() {
  const { activeId, refreshProfiles, switchProfile } = useProfile();
  const { theme, setTheme } = useTheme();
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
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [toast, setToast] = useState("");
  const [editingProfile, setEditingProfile] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editColor, setEditColor] = useState("");
  const [showNewProfile, setShowNewProfile] = useState(false);
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState(PROFILE_COLORS[1]);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [clearInput, setClearInput] = useState("");
  const importRef = useRef<HTMLInputElement>(null);

  // Reminders
  const [reminders, setReminders] = useState<ReminderSettings>({ weighIn: false, meals: false, workout: false, water: false });
  const [notifPermission, setNotifPermission] = useState<NotificationPermission>("default");

  useEffect(() => {
    setMounted(true);
    setSettings(getSettings());
    setProfiles(getProfiles());
    setReminders(getReminders());
    if (typeof Notification !== "undefined") {
      setNotifPermission(Notification.permission);
    }
  }, [activeId]);

  if (!mounted) {
    return <SettingsSkeleton />;
  }

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    saveSettings(settings);
    setToast("Settings saved!");
  }

  function updateMacroPct(field: "proteinPct" | "carbsPct" | "fatPct", value: number) {
    const next = { ...settings, [field]: value };
    const total = next.proteinPct + next.carbsPct + next.fatPct;
    if (total !== 100) {
      if (field === "proteinPct") {
        const remaining = 100 - next.proteinPct;
        const ratio = next.carbsPct + next.fatPct > 0 ? remaining / (next.carbsPct + next.fatPct) : 0.5;
        next.carbsPct = Math.round(next.carbsPct * ratio);
        next.fatPct = 100 - next.proteinPct - next.carbsPct;
      } else if (field === "carbsPct") {
        const remaining = 100 - next.carbsPct;
        const ratio = next.proteinPct + next.fatPct > 0 ? remaining / (next.proteinPct + next.fatPct) : 0.5;
        next.proteinPct = Math.round(next.proteinPct * ratio);
        next.fatPct = 100 - next.proteinPct - next.carbsPct;
      } else {
        const remaining = 100 - next.fatPct;
        const ratio = next.proteinPct + next.carbsPct > 0 ? remaining / (next.proteinPct + next.carbsPct) : 0.5;
        next.proteinPct = Math.round(next.proteinPct * ratio);
        next.carbsPct = 100 - next.proteinPct - next.fatPct;
      }
    }
    setSettings(next);
  }

  function handleAddProfile() {
    const trimmed = newName.trim();
    if (!trimmed) return;
    saveProfile({ name: trimmed, color: newColor });
    setNewName("");
    setShowNewProfile(false);
    setProfiles(getProfiles());
    refreshProfiles();
    setToast("Profile created!");
  }

  function handleEditProfile(id: string) {
    const p = profiles.find((pr) => pr.id === id);
    if (!p) return;
    setEditingProfile(id);
    setEditName(p.name);
    setEditColor(p.color);
  }

  function handleSaveEdit() {
    if (!editingProfile) return;
    updateProfile(editingProfile, { name: editName.trim() || "User", color: editColor });
    setEditingProfile(null);
    setProfiles(getProfiles());
    refreshProfiles();
    setToast("Profile updated!");
  }

  function handleDeleteProfile(id: string) {
    deleteProfile(id);
    setConfirmDelete(null);
    const updated = getProfiles();
    setProfiles(updated);
    if (id === activeId && updated.length > 0) {
      switchProfile(updated[0].id);
    }
    refreshProfiles();
    setToast("Profile deleted.");
  }

  function handleExport() {
    const json = exportProfileData();
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `fitlife-export-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setToast("Data exported!");
  }

  function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      if (importProfileData(text)) {
        setSettings(getSettings());
        setToast("Data imported successfully!");
      } else {
        setToast("Import failed — invalid file.");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  }

  function handleClearData() {
    if (clearInput !== "DELETE") return;
    clearProfileData();
    setShowClearConfirm(false);
    setClearInput("");
    setSettings(getSettings());
    setToast("All data cleared.");
  }

  function toggleReminder(key: keyof ReminderSettings) {
    const next = { ...reminders, [key]: !reminders[key] };
    setReminders(next);
    saveReminders(next);
  }

  async function requestNotificationPermission() {
    if (typeof Notification === "undefined") return;
    const result = await Notification.requestPermission();
    setNotifPermission(result);
    if (result === "granted") {
      setToast("Notifications enabled!");
    }
  }

  const macros = getMacroTargets(settings);
  const suggestedCals = getSuggestedCalories(2000, settings.weightGoal);

  return (
    <div className="space-y-4">
      {toast && <Toast message={toast} onClose={() => setToast("")} />}

      <h1 className="text-xl font-bold text-gray-900 dark:text-white">Settings</h1>

      {/* Profiles */}
      <div className="bg-gray-100 dark:bg-slate-800 rounded-2xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-600 dark:text-slate-300">Profiles</h2>
          {profiles.length < 4 && (
            <button
              onClick={() => setShowNewProfile(true)}
              className="text-xs text-teal-500 dark:text-teal-400 hover:text-teal-400 dark:hover:text-teal-300 flex items-center gap-1 transition"
            >
              <Plus size={12} /> Add
            </button>
          )}
        </div>

        <div className="space-y-2">
          {profiles.map((p) => {
            const isActive = p.id === activeId;
            const isEditing = editingProfile === p.id;

            if (isEditing) {
              return (
                <div key={p.id} className="bg-gray-200 dark:bg-slate-700 rounded-lg p-3 space-y-2">
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full bg-gray-300 dark:bg-slate-600 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-teal-500"
                  />
                  <div className="flex gap-2">
                    {PROFILE_COLORS.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setEditColor(c)}
                        className={`w-6 h-6 rounded-full transition-all ${
                          editColor === c ? "ring-2 ring-teal-500 scale-110" : "opacity-50"
                        }`}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={handleSaveEdit}
                      className="flex-1 bg-teal-600 text-white text-xs py-1.5 rounded-lg flex items-center justify-center gap-1"
                    >
                      <Check size={12} /> Save
                    </button>
                    <button
                      onClick={() => setEditingProfile(null)}
                      className="flex-1 bg-gray-300 dark:bg-slate-600 text-gray-600 dark:text-slate-300 text-xs py-1.5 rounded-lg flex items-center justify-center gap-1"
                    >
                      <X size={12} /> Cancel
                    </button>
                  </div>
                </div>
              );
            }

            return (
              <div
                key={p.id}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg ${
                  isActive ? "bg-gray-200 dark:bg-slate-700" : "bg-gray-100 dark:bg-slate-800"
                }`}
              >
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
                  style={{ backgroundColor: p.color }}
                >
                  {p.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{p.name}</p>
                  {isActive && (
                    <p className="text-[10px] text-teal-500 dark:text-teal-400">Active</p>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  {!isActive && (
                    <button
                      onClick={() => switchProfile(p.id)}
                      className="text-[10px] text-gray-500 dark:text-slate-400 hover:text-teal-500 dark:hover:text-teal-400 px-2 py-1 transition"
                    >
                      Switch
                    </button>
                  )}
                  <button
                    onClick={() => handleEditProfile(p.id)}
                    className="text-[10px] text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white px-2 py-1 transition"
                  >
                    Edit
                  </button>
                  {!isActive && profiles.length > 1 && (
                    <>
                      {confirmDelete === p.id ? (
                        <div className="flex items-center gap-1">
                          <button onClick={() => handleDeleteProfile(p.id)} className="text-[10px] text-red-400 px-1">Confirm</button>
                          <button onClick={() => setConfirmDelete(null)} className="text-[10px] text-gray-500 dark:text-slate-400 px-1">No</button>
                        </div>
                      ) : (
                        <button onClick={() => setConfirmDelete(p.id)} className="text-gray-400 dark:text-slate-500 hover:text-red-400 p-1 transition">
                          <Trash2 size={12} />
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {showNewProfile && (
          <div className="bg-gray-200 dark:bg-slate-700 rounded-lg p-3 space-y-2">
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Profile name"
              autoFocus
              className="w-full bg-gray-300 dark:bg-slate-600 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-slate-500 outline-none focus:ring-2 focus:ring-teal-500"
            />
            <div className="flex gap-2">
              {PROFILE_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setNewColor(c)}
                  className={`w-6 h-6 rounded-full transition-all ${
                    newColor === c ? "ring-2 ring-teal-500 scale-110" : "opacity-50"
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
            <div className="flex gap-2">
              <button onClick={handleAddProfile} className="flex-1 bg-teal-600 text-white text-xs py-1.5 rounded-lg flex items-center justify-center gap-1">
                <Plus size={12} /> Create
              </button>
              <button onClick={() => setShowNewProfile(false)} className="flex-1 bg-gray-300 dark:bg-slate-600 text-gray-600 dark:text-slate-300 text-xs py-1.5 rounded-lg">
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Theme */}
      <div className="bg-gray-100 dark:bg-slate-800 rounded-2xl p-4 space-y-3">
        <h2 className="text-sm font-semibold text-gray-600 dark:text-slate-300">Appearance</h2>
        <div className="grid grid-cols-3 gap-2">
          {THEME_OPTIONS.map((opt) => {
            const Icon = opt.icon;
            return (
              <button
                key={opt.value}
                onClick={() => setTheme(opt.value)}
                className={`flex flex-col items-center gap-1.5 py-3 rounded-xl transition ${
                  theme === opt.value
                    ? "bg-teal-600 text-white"
                    : "bg-gray-200 dark:bg-slate-700 text-gray-500 dark:text-slate-400 hover:bg-gray-300 dark:hover:bg-slate-600"
                }`}
              >
                <Icon size={18} />
                <span className="text-xs font-medium">{opt.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Reminders */}
      <div className="bg-gray-100 dark:bg-slate-800 rounded-2xl p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Bell size={14} className="text-amber-500" />
          <h2 className="text-sm font-semibold text-gray-600 dark:text-slate-300">Reminders</h2>
        </div>

        {[
          { key: "weighIn" as const, label: "Weigh-in", icon: Scale },
          { key: "meals" as const, label: "Meals", icon: Utensils },
          { key: "workout" as const, label: "Workout", icon: Dumbbell },
          { key: "water" as const, label: "Water", icon: Droplets },
        ].map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => toggleReminder(key)}
            className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl bg-gray-200 dark:bg-slate-700 hover:bg-gray-300 dark:hover:bg-slate-600 transition"
          >
            <div className="flex items-center gap-2.5">
              <Icon size={16} className="text-gray-500 dark:text-slate-400" />
              <span className="text-sm text-gray-900 dark:text-white">{label}</span>
            </div>
            <div
              className={`w-10 h-6 rounded-full transition-colors flex items-center ${
                reminders[key] ? "bg-teal-600 justify-end" : "bg-gray-300 dark:bg-slate-600 justify-start"
              }`}
            >
              <div className="w-5 h-5 bg-white rounded-full shadow mx-0.5" />
            </div>
          </button>
        ))}

        {notifPermission !== "granted" && (
          <button
            onClick={requestNotificationPermission}
            className="w-full text-xs text-amber-500 hover:text-amber-400 py-1.5 transition"
          >
            {notifPermission === "denied" ? "Notifications blocked — reminders shown as banners" : "Enable browser notifications"}
          </button>
        )}
      </div>

      {/* Settings form */}
      <form onSubmit={handleSave} className="space-y-4">
        <div className="bg-gray-100 dark:bg-slate-800 rounded-2xl p-4 space-y-4">
          <h2 className="text-sm font-semibold text-gray-600 dark:text-slate-300">Profile Settings</h2>
          <div>
            <label className="text-xs text-gray-500 dark:text-slate-400 font-medium">Display Name</label>
            <input
              type="text"
              value={settings.name}
              onChange={(e) => setSettings({ ...settings, name: e.target.value })}
              className="w-full mt-1 bg-gray-200 dark:bg-slate-700 rounded-lg px-3 py-2.5 text-sm text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>
          <div>
            <label className="text-xs text-gray-500 dark:text-slate-400 font-medium">Daily Water Goal (glasses)</label>
            <input
              type="number"
              value={settings.waterGoal}
              onChange={(e) => setSettings({ ...settings, waterGoal: parseInt(e.target.value) || 1 })}
              min={1}
              max={20}
              inputMode="numeric"
              className="w-full mt-1 bg-gray-200 dark:bg-slate-700 rounded-lg px-3 py-2.5 text-sm text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-teal-500"
            />
            <p className="text-xs text-gray-400 dark:text-slate-500 mt-1">1 glass = 250ml</p>
          </div>
        </div>

        <div className="bg-gray-100 dark:bg-slate-800 rounded-2xl p-4 space-y-4">
          <h2 className="text-sm font-semibold text-gray-600 dark:text-slate-300">Nutrition Targets</h2>

          <div>
            <label className="text-xs text-gray-500 dark:text-slate-400 font-medium mb-2 block">Weight Goal</label>
            <div className="grid grid-cols-3 gap-1.5">
              {GOAL_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setSettings({ ...settings, weightGoal: opt.value })}
                  className={`py-2 px-2 rounded-lg text-center transition ${
                    settings.weightGoal === opt.value
                      ? "bg-teal-600 text-white"
                      : "bg-gray-200 dark:bg-slate-700 text-gray-500 dark:text-slate-400"
                  }`}
                >
                  <p className="text-xs font-medium">{opt.label}</p>
                  <p className="text-[10px] opacity-60 mt-0.5">{opt.desc}</p>
                </button>
              ))}
            </div>
            <p className="text-[10px] text-gray-400 dark:text-slate-500 mt-1.5">
              Suggested: {suggestedCals} cal/day for{" "}
              {settings.weightGoal === "lose" ? "weight loss" : settings.weightGoal === "gain" ? "weight gain" : "maintenance"}
            </p>
          </div>

          <div>
            <label className="text-xs text-gray-500 dark:text-slate-400 font-medium">Daily Calorie Target</label>
            <input
              type="number"
              value={settings.calorieTarget}
              onChange={(e) => setSettings({ ...settings, calorieTarget: parseInt(e.target.value) || 1000 })}
              min={500}
              max={10000}
              step={50}
              inputMode="numeric"
              className="w-full mt-1 bg-gray-200 dark:bg-slate-700 rounded-lg px-3 py-2.5 text-sm text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>

          <div>
            <label className="text-xs text-gray-500 dark:text-slate-400 font-medium mb-2 block">Macro Split</label>
            <div className="space-y-3">
              <MacroSlider label="Protein" pct={settings.proteinPct} grams={macros.protein} color="bg-teal-500" onChange={(v) => updateMacroPct("proteinPct", v)} />
              <MacroSlider label="Carbs" pct={settings.carbsPct} grams={macros.carbs} color="bg-cyan-500" onChange={(v) => updateMacroPct("carbsPct", v)} />
              <MacroSlider label="Fat" pct={settings.fatPct} grams={macros.fat} color="bg-amber-500" onChange={(v) => updateMacroPct("fatPct", v)} />
            </div>
            <p className="text-[10px] text-gray-400 dark:text-slate-500 mt-2">
              Total: {settings.proteinPct + settings.carbsPct + settings.fatPct}% — Adjusts automatically to 100%
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

      {/* Data Management */}
      <div className="bg-gray-100 dark:bg-slate-800 rounded-2xl p-4 space-y-3">
        <h2 className="text-sm font-semibold text-gray-600 dark:text-slate-300">Data Management</h2>

        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={handleExport}
            className="flex items-center justify-center gap-1.5 bg-gray-200 dark:bg-slate-700 hover:bg-gray-300 dark:hover:bg-slate-600 text-gray-900 dark:text-white py-2.5 rounded-xl text-xs font-medium transition"
          >
            <Download size={14} /> Export Data
          </button>
          <button
            onClick={() => importRef.current?.click()}
            className="flex items-center justify-center gap-1.5 bg-gray-200 dark:bg-slate-700 hover:bg-gray-300 dark:hover:bg-slate-600 text-gray-900 dark:text-white py-2.5 rounded-xl text-xs font-medium transition"
          >
            <Upload size={14} /> Import Data
          </button>
          <input ref={importRef} type="file" accept=".json" className="hidden" onChange={handleImport} />
        </div>

        {!showClearConfirm ? (
          <button
            onClick={() => setShowClearConfirm(true)}
            className="w-full flex items-center justify-center gap-1.5 bg-red-600/10 dark:bg-red-600/20 hover:bg-red-600/20 dark:hover:bg-red-600/30 text-red-500 dark:text-red-400 py-2.5 rounded-xl text-xs font-medium transition"
          >
            <AlertTriangle size={14} /> Clear All Profile Data
          </button>
        ) : (
          <div className="bg-red-50 dark:bg-red-600/10 rounded-xl p-3 space-y-2">
            <p className="text-xs text-red-500 dark:text-red-400 font-medium">
              This will permanently delete all data for the current profile. Type DELETE to confirm.
            </p>
            <input
              type="text"
              value={clearInput}
              onChange={(e) => setClearInput(e.target.value)}
              placeholder='Type "DELETE"'
              className="w-full bg-gray-200 dark:bg-slate-700 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-red-500"
            />
            <div className="flex gap-2">
              <button
                onClick={handleClearData}
                disabled={clearInput !== "DELETE"}
                className="flex-1 bg-red-600 disabled:bg-red-600/30 text-white disabled:text-red-300 text-xs py-2 rounded-lg transition"
              >
                Confirm Delete
              </button>
              <button
                onClick={() => { setShowClearConfirm(false); setClearInput(""); }}
                className="flex-1 bg-gray-200 dark:bg-slate-700 text-gray-600 dark:text-slate-300 text-xs py-2 rounded-lg"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      <AISettings onToast={setToast} />

      <div className="bg-gray-100 dark:bg-slate-800 rounded-2xl p-4">
        <h2 className="text-sm font-semibold text-gray-600 dark:text-slate-300 mb-2">About</h2>
        <p className="text-xs text-gray-500 dark:text-slate-400 leading-relaxed">
          FitLife v2.0 — Your personal health and fitness tracker. Data is stored
          locally on your device. Supports multiple profiles and AI-powered features.
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
        <span className="text-xs text-gray-600 dark:text-slate-300">{label}</span>
        <span className="text-xs text-gray-500 dark:text-slate-400">{pct}% · {grams}g</span>
      </div>
      <input
        type="range"
        min={5}
        max={70}
        value={pct}
        onChange={(e) => onChange(parseInt(e.target.value))}
        className="w-full h-1.5 rounded-full appearance-none cursor-pointer bg-gray-200 dark:bg-slate-700
          [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-teal-500 [&::-webkit-slider-thumb]:shadow-md
          [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-teal-500 [&::-moz-range-thumb]:border-0"
      />
      <div className="h-1 bg-gray-200 dark:bg-slate-700 rounded-full -mt-2.5 mb-2 pointer-events-none overflow-hidden">
        <div
          className={`h-full ${color} rounded-full transition-all`}
          style={{ width: `${(pct / 70) * 100}%` }}
        />
      </div>
    </div>
  );
}
