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
  getAiSettings,
  saveAiSettings,
  AI_MODELS_FALLBACK,
  getCachedModels,
  saveCachedModels,
  type UserSettings,
  type WeightGoal,
  type Profile,
  type AiSettings,
  type AiModelInfo,
} from "@/lib/storage";
import { askAI } from "@/lib/ai";
import { useProfile } from "@/lib/ProfileContext";
import Toast from "@/components/Toast";
import VoiceSettingsCard from "@/components/VoiceSettingsCard";
import {
  Trash2,
  Plus,
  Download,
  Upload,
  AlertTriangle,
  Check,
  X,
  Sparkles,
  Zap,
  Loader2,
  CheckCircle,
  XCircle,
  RefreshCw,
} from "lucide-react";

const GOAL_OPTIONS: { value: WeightGoal; label: string; desc: string }[] = [
  { value: "lose", label: "Lose Weight", desc: "-300 cal/day" },
  { value: "maintain", label: "Maintain", desc: "No adjustment" },
  { value: "gain", label: "Gain Weight", desc: "+300 cal/day" },
];

export default function SettingsPage() {
  const { activeId, refreshProfiles, switchProfile } = useProfile();
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

  // AI settings state
  const [aiSettings, setAiSettingsState] = useState<AiSettings>({ apiKey: "", model: "claude-sonnet-4-6" });
  const [aiTestStatus, setAiTestStatus] = useState<"idle" | "testing" | "success" | "error">("idle");
  const [aiTestError, setAiTestError] = useState("");
  const [aiModels, setAiModels] = useState<AiModelInfo[]>(AI_MODELS_FALLBACK);
  const [modelsLoading, setModelsLoading] = useState(false);

  async function fetchModels() {
    setModelsLoading(true);
    try {
      const res = await fetch("/api/models");
      if (!res.ok) throw new Error("Failed to fetch models");
      const data = await res.json();
      const allModels: Array<{ id: string; display_name?: string; capabilities?: { image_input?: boolean } }> =
        data.data ?? data;
      // Filter to image-capable models, map to our format
      const imageCapable = allModels.filter(
        (m) => m.capabilities?.image_input !== false
      );
      // Determine sort order: haiku < sonnet < opus, then by id
      function sortKey(id: string): number {
        if (id.includes("haiku")) return 0;
        if (id.includes("sonnet")) return 1;
        if (id.includes("opus")) return 2;
        return 3;
      }
      imageCapable.sort((a, b) => sortKey(a.id) - sortKey(b.id) || a.id.localeCompare(b.id));
      const mapped: AiModelInfo[] = imageCapable.map((m) => {
        const name = m.display_name || m.id;
        let costNote = "";
        if (m.id.includes("haiku")) costNote = "~$0.001/req";
        else if (m.id.includes("sonnet")) costNote = "~$0.01/req";
        else if (m.id.includes("opus")) costNote = "~$0.05/req";
        return { id: m.id, name, desc: m.id, costNote };
      });
      if (mapped.length > 0) {
        setAiModels(mapped);
        saveCachedModels(mapped);
      }
    } catch {
      // Fall back to hardcoded list (already set)
    } finally {
      setModelsLoading(false);
    }
  }

  useEffect(() => {
    setMounted(true);
    setSettings(getSettings());
    setProfiles(getProfiles());
    setAiSettingsState(getAiSettings());
    const cached = getCachedModels();
    if (cached && cached.length > 0) {
      setAiModels(cached);
    } else {
      fetchModels();
    }
  }, [activeId]);

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
    const total = next.proteinPct + next.carbsPct + next.fatPct;
    if (total !== 100) {
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

  const macros = getMacroTargets(settings);
  const suggestedCals = getSuggestedCalories(2000, settings.weightGoal);

  return (
    <div className="space-y-4">
      {toast && <Toast message={toast} onClose={() => setToast("")} />}

      <h1 className="text-xl font-bold">Settings</h1>

      {/* Profiles */}
      <div className="bg-slate-800 rounded-2xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-300">Profiles</h2>
          {profiles.length < 4 && (
            <button
              onClick={() => setShowNewProfile(true)}
              className="text-xs text-teal-400 hover:text-teal-300 flex items-center gap-1 transition"
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
                <div key={p.id} className="bg-slate-700 rounded-lg p-3 space-y-2">
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full bg-slate-600 rounded-lg px-3 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-teal-500"
                  />
                  <div className="flex gap-2">
                    {PROFILE_COLORS.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setEditColor(c)}
                        className={`w-6 h-6 rounded-full transition-all ${
                          editColor === c ? "ring-2 ring-white scale-110" : "opacity-50"
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
                      className="flex-1 bg-slate-600 text-slate-300 text-xs py-1.5 rounded-lg flex items-center justify-center gap-1"
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
                  isActive ? "bg-slate-700" : "bg-slate-800"
                }`}
              >
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
                  style={{ backgroundColor: p.color }}
                >
                  {p.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">
                    {p.name}
                  </p>
                  {isActive && (
                    <p className="text-[10px] text-teal-400">Active</p>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  {!isActive && (
                    <button
                      onClick={() => switchProfile(p.id)}
                      className="text-[10px] text-slate-400 hover:text-teal-400 px-2 py-1 transition"
                    >
                      Switch
                    </button>
                  )}
                  <button
                    onClick={() => handleEditProfile(p.id)}
                    className="text-[10px] text-slate-400 hover:text-white px-2 py-1 transition"
                  >
                    Edit
                  </button>
                  {!isActive && profiles.length > 1 && (
                    <>
                      {confirmDelete === p.id ? (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleDeleteProfile(p.id)}
                            className="text-[10px] text-red-400 px-1"
                          >
                            Confirm
                          </button>
                          <button
                            onClick={() => setConfirmDelete(null)}
                            className="text-[10px] text-slate-400 px-1"
                          >
                            No
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setConfirmDelete(p.id)}
                          className="text-slate-500 hover:text-red-400 p-1 transition"
                        >
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

        {/* New profile form */}
        {showNewProfile && (
          <div className="bg-slate-700 rounded-lg p-3 space-y-2">
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Profile name"
              autoFocus
              className="w-full bg-slate-600 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 outline-none focus:ring-2 focus:ring-teal-500"
            />
            <div className="flex gap-2">
              {PROFILE_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setNewColor(c)}
                  className={`w-6 h-6 rounded-full transition-all ${
                    newColor === c ? "ring-2 ring-white scale-110" : "opacity-50"
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleAddProfile}
                className="flex-1 bg-teal-600 text-white text-xs py-1.5 rounded-lg flex items-center justify-center gap-1"
              >
                <Plus size={12} /> Create
              </button>
              <button
                onClick={() => setShowNewProfile(false)}
                className="flex-1 bg-slate-600 text-slate-300 text-xs py-1.5 rounded-lg"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Settings form */}
      <form onSubmit={handleSave} className="space-y-4">
        {/* Profile settings */}
        <div className="bg-slate-800 rounded-2xl p-4 space-y-4">
          <h2 className="text-sm font-semibold text-slate-300">Profile Settings</h2>
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

      {/* Data Management */}
      <div className="bg-slate-800 rounded-2xl p-4 space-y-3">
        <h2 className="text-sm font-semibold text-slate-300">Data Management</h2>

        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={handleExport}
            className="flex items-center justify-center gap-1.5 bg-slate-700 hover:bg-slate-600 text-white py-2.5 rounded-xl text-xs font-medium transition"
          >
            <Download size={14} /> Export Data
          </button>
          <button
            onClick={() => importRef.current?.click()}
            className="flex items-center justify-center gap-1.5 bg-slate-700 hover:bg-slate-600 text-white py-2.5 rounded-xl text-xs font-medium transition"
          >
            <Upload size={14} /> Import Data
          </button>
          <input
            ref={importRef}
            type="file"
            accept=".json"
            className="hidden"
            onChange={handleImport}
          />
        </div>

        {!showClearConfirm ? (
          <button
            onClick={() => setShowClearConfirm(true)}
            className="w-full flex items-center justify-center gap-1.5 bg-red-600/20 hover:bg-red-600/30 text-red-400 py-2.5 rounded-xl text-xs font-medium transition"
          >
            <AlertTriangle size={14} /> Clear All Profile Data
          </button>
        ) : (
          <div className="bg-red-600/10 rounded-xl p-3 space-y-2">
            <p className="text-xs text-red-400 font-medium">
              This will permanently delete all data for the current profile.
              Type DELETE to confirm.
            </p>
            <input
              type="text"
              value={clearInput}
              onChange={(e) => setClearInput(e.target.value)}
              placeholder='Type "DELETE"'
              className="w-full bg-slate-700 rounded-lg px-3 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-red-500"
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
                onClick={() => {
                  setShowClearConfirm(false);
                  setClearInput("");
                }}
                className="flex-1 bg-slate-700 text-slate-300 text-xs py-2 rounded-lg"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* AI Settings */}
      <div className="bg-slate-800 rounded-2xl p-4 space-y-4">
        <div className="flex items-center gap-2">
          <Sparkles size={14} className="text-violet-400" />
          <h2 className="text-sm font-semibold text-slate-300">AI Settings</h2>
        </div>

        <p className="text-[11px] text-slate-400 leading-relaxed">
          API keys are configured server-side via{" "}
          <code className="text-[10px] bg-slate-700 px-1 py-0.5 rounded">ANTHROPIC_API_KEY</code>
          {" "}and{" "}
          <code className="text-[10px] bg-slate-700 px-1 py-0.5 rounded">MISTRAL_API_KEY</code>
          . Nothing to enter here.
        </p>

        {/* Model Selector */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs text-slate-400 font-medium">Model</label>
            <button
              type="button"
              onClick={() => fetchModels()}
              disabled={modelsLoading}
              className="flex items-center gap-1 text-[10px] text-violet-400 hover:text-violet-300 disabled:opacity-50 transition"
            >
              <RefreshCw size={10} className={modelsLoading ? "animate-spin" : ""} />
              {modelsLoading ? "Loading..." : "Refresh Models"}
            </button>
          </div>
          <div className="space-y-1.5">
            {aiModels.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() =>
                  setAiSettingsState({ ...aiSettings, model: m.id })
                }
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-left transition ${
                  aiSettings.model === m.id
                    ? "bg-violet-600/20 border border-violet-500/30"
                    : "bg-slate-700 border border-transparent"
                }`}
              >
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-white">{m.name}</p>
                  <p className="text-[10px] text-slate-400 truncate">{m.desc}</p>
                </div>
                {m.costNote && (
                  <span className="text-[10px] text-slate-500 shrink-0 ml-2">
                    {m.costNote}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Save + Test */}
        <div className="flex gap-2">
          <button
            onClick={() => {
              saveAiSettings(aiSettings);
              setToast("Model saved!");
            }}
            className="flex-1 bg-violet-600 hover:bg-violet-500 text-white py-2.5 rounded-xl text-xs font-semibold transition flex items-center justify-center gap-1.5"
          >
            <Sparkles size={13} /> Save Model
          </button>
          <button
            onClick={async () => {
              setAiTestStatus("testing");
              setAiTestError("");
              // Save first so askAI reads the latest settings
              saveAiSettings(aiSettings);
              try {
                await askAI({ system: "Reply with just OK.", userMessage: "Test", maxTokens: 16 });
                setAiTestStatus("success");
              } catch (err) {
                setAiTestStatus("error");
                setAiTestError(err instanceof Error ? err.message : "Connection failed");
              }
            }}
            disabled={aiTestStatus === "testing"}
            className="px-4 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-white py-2.5 rounded-xl text-xs font-medium transition flex items-center justify-center gap-1.5"
          >
            {aiTestStatus === "testing" ? (
              <Loader2 size={13} className="animate-spin" />
            ) : aiTestStatus === "success" ? (
              <CheckCircle size={13} className="text-green-400" />
            ) : aiTestStatus === "error" ? (
              <XCircle size={13} className="text-red-400" />
            ) : (
              <Zap size={13} />
            )}
            Test
          </button>
        </div>
        {aiTestStatus === "error" && aiTestError && (
          <p className="text-[10px] text-red-400">{aiTestError}</p>
        )}
        {aiTestStatus === "success" && (
          <p className="text-[10px] text-green-400">Connection successful!</p>
        )}
      </div>

      <VoiceSettingsCard />

      <div className="bg-slate-800 rounded-2xl p-4">
        <h2 className="text-sm font-semibold text-slate-300 mb-2">About</h2>
        <p className="text-xs text-slate-400 leading-relaxed">
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
