"use client";

import { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";
import {
  getAiSettings,
  getActiveModelInfo,
  PROVIDER_LABELS,
  type AiSettings,
} from "@/lib/ai-providers";

interface AIBadgeProps {
  /** Optional prefix, e.g. "Coach" renders "Coach powered by …". */
  label?: string;
  className?: string;
}

/**
 * Small pill showing which AI provider + model is currently active.
 * Re-reads settings when the `ai_settings` localStorage key changes
 * so other tabs / the settings page update the badge live.
 */
export default function AIBadge({ label, className }: AIBadgeProps) {
  const [settings, setSettings] = useState<AiSettings | null>(null);

  useEffect(() => {
    setSettings(getAiSettings());
    function onStorage(e: StorageEvent) {
      if (!e.key || e.key === "ai_settings") {
        setSettings(getAiSettings());
      }
    }
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  if (!settings) return null;

  const modelInfo = getActiveModelInfo(settings);
  const providerName = PROVIDER_LABELS[settings.provider];
  const modelName = modelInfo?.name ?? settings.model;
  const text = label
    ? `${label} powered by ${providerName} ${modelName}`
    : `Powered by ${providerName} ${modelName}`;

  return (
    <span
      className={
        "inline-flex items-center gap-1.5 bg-violet-500/10 text-violet-600 dark:text-violet-300 text-[10px] font-medium px-2 py-0.5 rounded-full " +
        (className ?? "")
      }
      title={`Provider: ${providerName} — Model: ${settings.model}`}
    >
      <Sparkles size={10} />
      {text}
    </span>
  );
}
