// Multi-provider AI settings surface.
// All new AI logic lives here; src/lib/storage.ts AI exports are legacy dead code.

export type AIProvider = "anthropic" | "mistral";

export const PROVIDER_LABELS: Record<AIProvider, string> = {
  anthropic: "Anthropic",
  mistral: "Mistral",
};

export interface AiSettings {
  provider: AIProvider;
  model: string;
}

export interface AiModelInfo {
  id: string;
  name: string;
  desc: string;
  costNote?: string;
  provider: AIProvider;
}

export const AI_MODELS: AiModelInfo[] = [
  {
    id: "claude-haiku-4-5-20251001",
    name: "Haiku 4.5",
    desc: "Fast & cheap",
    costNote: "~$0.001/request",
    provider: "anthropic",
  },
  {
    id: "claude-sonnet-4-6",
    name: "Sonnet 4.6",
    desc: "Balanced",
    costNote: "~$0.01/request",
    provider: "anthropic",
  },
  {
    id: "mistral-small-latest",
    name: "Mistral Small 4",
    desc: "Fast & very cheap (EU)",
    costNote: "~$0.001/request",
    provider: "mistral",
  },
  {
    id: "mistral-large-latest",
    name: "Mistral Large 3",
    desc: "Most capable (EU)",
    costNote: "~$0.01/request",
    provider: "mistral",
  },
];

export const DEFAULT_MODEL_BY_PROVIDER: Record<AIProvider, string> = {
  anthropic: "claude-sonnet-4-6",
  mistral: "mistral-large-latest",
};

export function modelsForProvider(p: AIProvider): AiModelInfo[] {
  return AI_MODELS.filter((m) => m.provider === p);
}

export function defaultModelFor(p: AIProvider): string {
  return DEFAULT_MODEL_BY_PROVIDER[p];
}

const SETTINGS_KEY = "ai_settings";

function readJSON<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function getAiSettings(): AiSettings {
  const stored = readJSON<Partial<AiSettings>>(SETTINGS_KEY, {});
  const provider: AIProvider =
    stored.provider === "anthropic" || stored.provider === "mistral"
      ? stored.provider
      : "anthropic";
  const validIds = new Set(modelsForProvider(provider).map((m) => m.id));
  const model =
    stored.model && validIds.has(stored.model)
      ? stored.model
      : DEFAULT_MODEL_BY_PROVIDER[provider];
  return { provider, model };
}

export function saveAiSettings(s: AiSettings): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
}

export function getActiveModelInfo(s: AiSettings): AiModelInfo | undefined {
  return AI_MODELS.find((m) => m.id === s.model);
}

export interface AiStatus {
  anthropic: boolean;
  mistral: boolean;
}

export async function fetchAiStatus(): Promise<AiStatus> {
  const res = await fetch("/api/ai/status");
  return res.json() as Promise<AiStatus>;
}
