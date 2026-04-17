import { getAiSettings } from "./storage";
import { isValidModelId, MAX_TOKENS_CAP } from "./ai-validation";

interface AskAIOptions {
  system?: string;
  userMessage: string;
  imageBase64?: string;
  maxTokens?: number;
}

interface AskAIChatOptions {
  system?: string;
  messages: Array<{ role: "user" | "assistant"; content: string }>;
  maxTokens?: number;
}

/**
 * Send a single user message (with optional image) to the AI.
 * Reads model and apiKey from localStorage AI settings.
 */
export async function askAI(options: AskAIOptions): Promise<string> {
  const { system, userMessage, imageBase64, maxTokens } = options;
  const { model, apiKey } = getAiSettings();

  let content: unknown;
  if (imageBase64) {
    const match = imageBase64.match(/^data:(image\/\w+);base64,(.+)$/);
    if (!match) throw new Error("Invalid image data");
    const [, mediaType, data] = match;
    content = [
      { type: "image", source: { type: "base64", media_type: mediaType, data } },
      { type: "text", text: userMessage },
    ];
  } else {
    content = userMessage;
  }

  return callAI({ model, apiKey, system, messages: [{ role: "user", content }], maxTokens });
}

/**
 * Send a multi-turn conversation to the AI.
 * Used by the coach for ongoing chat.
 */
export async function askAIChat(options: AskAIChatOptions): Promise<string> {
  const { system, messages, maxTokens } = options;
  const { model, apiKey } = getAiSettings();

  return callAI({ model, apiKey, system, messages, maxTokens });
}

async function callAI(params: {
  model: string;
  apiKey: string;
  system?: string;
  messages: Array<{ role: string; content: unknown }>;
  maxTokens?: number;
}): Promise<string> {
  if (!isValidModelId(params.model)) {
    throw new Error(`Invalid model: ${params.model}`);
  }

  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (params.apiKey) {
    headers["x-api-key"] = params.apiKey;
  }

  const res = await fetch("/api/ai", {
    method: "POST",
    headers,
    body: JSON.stringify({
      model: params.model,
      system: params.system,
      messages: params.messages,
      max_tokens: Math.min(params.maxTokens ?? 1024, MAX_TOKENS_CAP),
    }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || "AI request failed");
  }
  return data.text;
}
