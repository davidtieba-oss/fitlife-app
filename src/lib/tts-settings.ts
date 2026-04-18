// Persisted TTS preferences. Intentionally a small sibling module —
// src/lib/storage.ts is already the legacy god-module and should not grow.

const VOICE_KEY = "fitlife_tts_voice";
const USAGE_KEY = "fitlife_tts_usage_chars";

export function getTtsVoice(): string {
  if (typeof window === "undefined") return "";
  try {
    return localStorage.getItem(VOICE_KEY) ?? "";
  } catch {
    return "";
  }
}

export function setTtsVoice(voice: string): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(VOICE_KEY, voice);
  } catch {}
}

export function getTtsUsageChars(): number {
  if (typeof window === "undefined") return 0;
  try {
    return Number(localStorage.getItem(USAGE_KEY) ?? "0") || 0;
  } catch {
    return 0;
  }
}

export function addTtsUsage(chars: number): void {
  if (typeof window === "undefined") return;
  try {
    const current = getTtsUsageChars();
    localStorage.setItem(USAGE_KEY, String(current + chars));
  } catch {}
}

export function resetTtsUsage(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(USAGE_KEY, "0");
  } catch {}
}

export type MistralVoice = {
  id: string;
  name?: string;
  description?: string;
  languages?: string[];
  [key: string]: unknown;
};

export type VoicesResponse = {
  data?: MistralVoice[];
  voices?: MistralVoice[];
  [key: string]: unknown;
};

export async function fetchVoiceCatalog(): Promise<MistralVoice[]> {
  const res = await fetch("/api/tts/voices");
  if (!res.ok) {
    let msg = `Voices lookup failed (${res.status})`;
    try {
      const data = (await res.json()) as { error?: string };
      if (data.error) msg = data.error;
    } catch {}
    throw new Error(msg);
  }
  const json = (await res.json()) as VoicesResponse;
  return json.data ?? json.voices ?? [];
}
