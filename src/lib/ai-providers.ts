// Multi-provider AI settings surface.
//
// Lives outside src/lib/storage.ts so the much larger storage module can stay
// untouched while AIBadge.tsx and ai.ts compile against the new shape.
//
// Reads/writes the same `fitlife_ai_settings` localStorage key that
// storage.ts uses, so older clients reading `settings.model` keep working
// (we mirror the active provider's model into a `model` field on read).

export type AIProvider = "anthropic" | "mistral";

export const PROVIDER_LABELS: Record<AIProvider, string> = {
  anthropic: "Claude",
  mistral: "Mistral",
};

export interface AiSettings {
  provider: AIProvider;
  anthropicModel: string;
  mistralModel: string;
  /**
   * Legacy mirror of the active provider's model. Kept in sync by
   * getAiSettings so display code reading `settings.model` keeps working.
   */
  model: string;
}

export interface AiModelInfo {
  id: string;
  name: string;
  desc: string;
  costNote: string;
  provider?: AIProvider;
}

export const AI_MODELS_FALLBACK: AiModelInfo[] = [
  { id: "claude-haiku-4-5-20251001", name: "Haiku 4.5", desc: "Fastest & cheapest", costNote: "~$0.001/request", provider: "anthropic" },
  { id: "claude-sonnet-4-6", name: "Sonnet 4.6", desc: "Fast & smart — recommended", costNote: "~$0.01/request", provider: "anthropic" },
  { id: "claude-opus-4-6", name: "Opus 4.6", desc: "Most capable", costNote: "~$0.05/request", provider: "anthropic" },
  { id: "mistral-small-latest", name: "Mistral Small", desc: "Cheap & fast", costNote: "~$0.001/request", provider: "mistral" },
  { id: "mistral-large-latest", name: "Mistral Large", desc: "Most capable Mistral", costNote: "~$0.01/request", provider: "mistral" },
];

const DEFAULT_AI_SETTINGS: AiSettings = {
  provider: "anthropic",
  anthropicModel: "claude-sonnet-4-6",
  mistralModel: "mistral-large-latest",
  model: "claude-sonnet-4-6",
};

const SETTINGS_KEY = "fitlife_ai_settings";
const MODELS_CACHE_KEY = "fitlife_models_cache";
const MODEL_CACHE_TTL_MS = 24 * 60 * 60 * 1000;

interface CachedModels {
  models: AiModelInfo[];
  fetchedAt: number;
}

function readJSON<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeJSON<T>(key: string, value: T): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(key, JSON.stringify(value));
}

export function getAiSettings(): AiSettings {
  const stored = readJSON<Partial<AiSettings>>(SETTINGS_KEY, {});
  const merged: AiSettings = { ...DEFAULT_AI_SETTINGS, ...stored };
  // Keep legacy `model` field synced to the active provider's model.
  merged.model = merged.provider === "mistral" ? merged.mistralModel : merged.anthropicModel;
  return merged;
}

export function saveAiSettings(settings: AiSettings): void {
  writeJSON(SETTINGS_KEY, settings);
}

function getCachedModelList(): AiModelInfo[] | null {
  const cached = readJSON<CachedModels | null>(MODELS_CACHE_KEY, null);
  if (!cached) return null;
  if (Date.now() - cached.fetchedAt > MODEL_CACHE_TTL_MS) return null;
  return cached.models;
}

export function getActiveModelInfo(settings: AiSettings): AiModelInfo | undefined {
  const list = getCachedModelList() ?? AI_MODELS_FALLBACK;
  const activeId = settings.provider === "mistral" ? settings.mistralModel : settings.anthropicModel;
  return list.find((m) => m.id === activeId);
}
