"use client";

import { useEffect, useState } from "react";
import {
  Volume2,
  RefreshCw,
  Loader2,
  CheckCircle,
  XCircle,
  Play,
} from "lucide-react";
import {
  fetchVoiceCatalog,
  getTtsVoice,
  setTtsVoice,
  getTtsUsageChars,
  resetTtsUsage,
  type MistralVoice,
} from "@/lib/tts-settings";
import { requestTtsAudio } from "@/lib/tts";

const PREVIEW_TEXT =
  "Great work! Let's keep the momentum going. I'm your FitLife coach.";

export default function VoiceSettingsCard() {
  const [voices, setVoices] = useState<MistralVoice[]>([]);
  const [selected, setSelected] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [error, setError] = useState("");
  const [usage, setUsage] = useState(0);
  const [previewing, setPreviewing] = useState<string>("");
  const [saved, setSaved] = useState(false);

  const refresh = async () => {
    setStatus("loading");
    setError("");
    try {
      const list = await fetchVoiceCatalog();
      setVoices(list);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load voices");
      setStatus("error");
      return;
    }
    setStatus("idle");
  };

  useEffect(() => {
    setSelected(getTtsVoice());
    setUsage(getTtsUsageChars());
    refresh();
  }, []);

  function handleSelect(voiceId: string) {
    setSelected(voiceId);
    setTtsVoice(voiceId);
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  }

  async function handlePreview(voiceId: string) {
    if (previewing) return;
    setPreviewing(voiceId);
    setError("");
    try {
      const { url } = await requestTtsAudio(PREVIEW_TEXT, voiceId);
      const audio = new Audio(url);
      audio.onended = () => {
        URL.revokeObjectURL(url);
        setPreviewing("");
        setUsage(getTtsUsageChars());
      };
      audio.onerror = () => {
        URL.revokeObjectURL(url);
        setPreviewing("");
        setError("Playback failed");
      };
      await audio.play();
      setUsage(getTtsUsageChars());
    } catch (err) {
      setPreviewing("");
      setError(err instanceof Error ? err.message : "Preview failed");
    }
  }

  return (
    <div className="bg-slate-800 rounded-2xl p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Volume2 size={14} className="text-violet-400" />
          <h2 className="text-sm font-semibold text-slate-300">Voice (Text-to-Speech)</h2>
        </div>
        <button
          type="button"
          onClick={refresh}
          disabled={status === "loading"}
          className="flex items-center gap-1 text-[10px] text-violet-400 hover:text-violet-300 disabled:opacity-50 transition"
        >
          <RefreshCw size={10} className={status === "loading" ? "animate-spin" : ""} />
          {status === "loading" ? "Loading..." : "Refresh"}
        </button>
      </div>

      <p className="text-[11px] text-slate-400 leading-relaxed">
        Pick a voice for the Listen button on coach replies. Powered by Mistral
        Voxtral — configure <code className="text-[10px] bg-slate-700 px-1 py-0.5 rounded">MISTRAL_API_KEY</code>{" "}
        server-side.
      </p>

      {status === "error" && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
          <p className="text-[11px] text-red-400">{error}</p>
        </div>
      )}

      {voices.length > 0 && (
        <div className="space-y-1.5 max-h-80 overflow-y-auto">
          {voices.map((v) => {
            const active = selected === v.id;
            const isPreviewing = previewing === v.id;
            return (
              <div
                key={v.id}
                className={`flex items-center gap-2 px-3 py-2.5 rounded-lg transition ${
                  active
                    ? "bg-violet-600/20 border border-violet-500/30"
                    : "bg-slate-700 border border-transparent"
                }`}
              >
                <button
                  type="button"
                  onClick={() => handleSelect(v.id)}
                  className="flex-1 text-left min-w-0"
                >
                  <p className="text-xs font-medium text-white truncate">
                    {v.name ?? v.id}
                  </p>
                  <p className="text-[10px] text-slate-400 truncate">
                    {v.description ?? (v.languages?.length ? v.languages.join(", ") : v.id)}
                  </p>
                </button>
                <button
                  type="button"
                  onClick={() => handlePreview(v.id)}
                  disabled={!!previewing}
                  title="Preview"
                  className="shrink-0 p-1.5 rounded-md bg-slate-800 hover:bg-slate-900 text-violet-300 disabled:opacity-50 transition"
                >
                  {isPreviewing ? (
                    <Loader2 size={12} className="animate-spin" />
                  ) : (
                    <Play size={12} />
                  )}
                </button>
                {active && <CheckCircle size={14} className="text-violet-300 shrink-0" />}
              </div>
            );
          })}
        </div>
      )}

      {status === "idle" && voices.length === 0 && !error && (
        <p className="text-[11px] text-slate-500">No voices available.</p>
      )}

      {error && status !== "error" && (
        <div className="flex items-center gap-1.5 text-[10px] text-red-400">
          <XCircle size={12} /> {error}
        </div>
      )}

      <div className="flex items-center justify-between text-[10px] text-slate-500 pt-2 border-t border-slate-700/60">
        <span>
          Usage: <span className="text-slate-300 font-medium">{usage.toLocaleString()}</span>{" "}
          chars synthesized
        </span>
        <button
          type="button"
          onClick={() => {
            resetTtsUsage();
            setUsage(0);
          }}
          className="text-violet-400 hover:text-violet-300 transition"
        >
          Reset
        </button>
      </div>

      {saved && (
        <p className="text-[10px] text-green-400">Voice saved.</p>
      )}
    </div>
  );
}
