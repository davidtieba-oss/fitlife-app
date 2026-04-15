"use client";

import { useEffect, useState } from "react";
import { Sparkles, Loader2, CheckCircle, XCircle, Zap } from "lucide-react";
import {
  getAiSettings,
  saveAiSettings,
  modelsForProvider,
  defaultModelFor,
  fetchAiStatus,
  getActiveModelInfo,
  PROVIDER_LABELS,
  type AIProvider,
  type AiSettings,
  type AiStatus,
} from "@/lib/ai-providers";
import { askAI } from "@/lib/ai";

interface AISettingsProps {
  onToast?: (msg: string) => void;
}

export default function AISettings({ onToast }: AISettingsProps) {
  const [settings, setSettings] = useState<AiSettings>({
    provider: "anthropic",
    model: "claude-sonnet-4-6",
  });
  const [status, setStatus] = useState<AiStatus | null>(null);
  const [testState, setTestState] = useState<"idle" | "testing" | "ok" | "error">("idle");
  const [testError, setTestError] = useState("");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setSettings(getAiSettings());
    fetchAiStatus()
      .then(setStatus)
      .catch(() => setStatus({ anthropic: false, mistral: false }));
  }, []);

  if (!mounted) return null;

  function handleProviderTab(p: AIProvider) {
    // Keep model if it belongs to the new provider; otherwise switch to default.
    const available = modelsForProvider(p);
    const keepModel = available.some((m) => m.id === settings.model);
    setSettings({ provider: p, model: keepModel ? settings.model : defaultModelFor(p) });
    setTestState("idle");
    setTestError("");
  }

  function handleModelSelect(id: string) {
    setSettings({ ...settings, model: id });
  }

  function handleSave() {
    saveAiSettings(settings);
    // Dispatch a storage event so AIBadge in other components updates.
    window.dispatchEvent(
      new StorageEvent("storage", { key: "ai_settings" })
    );
    onToast?.("AI settings saved!");
  }

  async function handleTest() {
    setTestState("testing");
    setTestError("");
    try {
      await askAI({
        system: "Reply with just OK.",
        userMessage: "Say hi in one word",
        maxTokens: 16,
      });
      setTestState("ok");
    } catch (err) {
      setTestState("error");
      setTestError(err instanceof Error ? err.message : "Connection failed");
    }
  }

  const models = modelsForProvider(settings.provider);
  const activeInfo = getActiveModelInfo(settings);
  const providerLabel = PROVIDER_LABELS[settings.provider];
  const modelLabel = activeInfo?.name ?? settings.model;

  // Determine if the active provider is available (based on status check)
  const providerOk = status
    ? settings.provider === "anthropic"
      ? status.anthropic
      : status.mistral
    : null;

  return (
    <div className="bg-slate-800 rounded-2xl p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Sparkles size={14} className="text-violet-400" />
        <h2 className="text-sm font-semibold text-slate-300">AI Settings</h2>
      </div>

      {/* Provider tabs */}
      <div role="tablist" className="flex bg-slate-700 rounded-xl p-1 gap-1">
        {(["anthropic", "mistral"] as AIProvider[]).map((p) => (
          <button
            key={p}
            role="tab"
            aria-selected={settings.provider === p}
            onClick={() => handleProviderTab(p)}
            className={`flex-1 py-2 rounded-lg text-xs font-medium transition ${
              settings.provider === p
                ? "bg-violet-600 text-white"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            {PROVIDER_LABELS[p]}
          </button>
        ))}
      </div>

      {/* Model list */}
      <div className="space-y-1.5">
        {models.map((m) => (
          <button
            key={m.id}
            type="button"
            onClick={() => handleModelSelect(m.id)}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-left transition ${
              settings.model === m.id
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

      {/* Status dots */}
      <div className="space-y-1.5">
        {(["anthropic", "mistral"] as AIProvider[]).map((p) => {
          const ok = status ? (p === "anthropic" ? status.anthropic : status.mistral) : null;
          return (
            <div key={p} className="flex items-center gap-2">
              <span
                className={`w-2 h-2 rounded-full shrink-0 ${
                  ok === null
                    ? "bg-slate-500 animate-pulse"
                    : ok
                    ? "bg-green-400"
                    : "bg-red-500"
                }`}
              />
              <span className="text-[11px] text-slate-400">
                {PROVIDER_LABELS[p]}:{" "}
                {ok === null
                  ? "checking…"
                  : ok
                  ? "connected"
                  : "Not configured"}
              </span>
            </div>
          );
        })}
      </div>

      {/* Helper text */}
      <p className="text-[10px] text-slate-500 leading-relaxed">
        API keys are configured in Vercel environment variables (
        <span className="font-mono text-slate-400">ANTHROPIC_API_KEY</span>,{" "}
        <span className="font-mono text-slate-400">MISTRAL_API_KEY</span>).
        {settings.provider === "mistral" && (
          <> Mistral AI is a European provider — data processed in the EU.</>
        )}
      </p>

      {/* Active selection summary pill */}
      <div className="inline-flex items-center gap-1.5 bg-violet-600/15 text-violet-300 text-[10px] font-medium px-2.5 py-1 rounded-full">
        <Sparkles size={10} />
        Using {providerLabel} · {modelLabel}
      </div>

      {/* Save + Test buttons */}
      <div className="flex gap-2">
        <button
          onClick={handleSave}
          className="flex-1 bg-violet-600 hover:bg-violet-500 text-white py-2.5 rounded-xl text-xs font-semibold transition flex items-center justify-center gap-1.5"
        >
          <Sparkles size={13} /> Save AI Settings
        </button>
        <button
          onClick={handleTest}
          disabled={testState === "testing" || providerOk === false}
          className="px-4 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-white py-2.5 rounded-xl text-xs font-medium transition flex items-center justify-center gap-1.5"
        >
          {testState === "testing" ? (
            <Loader2 size={13} className="animate-spin" />
          ) : testState === "ok" ? (
            <CheckCircle size={13} className="text-green-400" />
          ) : testState === "error" ? (
            <XCircle size={13} className="text-red-400" />
          ) : (
            <Zap size={13} />
          )}
          Test
        </button>
      </div>

      {testState === "error" && testError && (
        <p className="text-[10px] text-red-400">{testError}</p>
      )}
      {testState === "ok" && (
        <p className="text-[10px] text-green-400">Connection successful!</p>
      )}
    </div>
  );
}
