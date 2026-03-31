import { getAiSettings } from "./storage";

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
 * Reads model from localStorage AI settings. API key is server-side only.
 */
export async function askAI(options: AskAIOptions): Promise<string> {
  const { system, userMessage, imageBase64, maxTokens } = options;
  const { model } = getAiSettings();

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

  return callAI({ model, system, messages: [{ role: "user", content }], maxTokens });
}

/**
 * Send a multi-turn conversation to the AI.
 * Used by the coach for ongoing chat.
 */
export async function askAIChat(options: AskAIChatOptions): Promise<string> {
  const { system, messages, maxTokens } = options;
  const { model } = getAiSettings();

  return callAI({ model, system, messages, maxTokens });
}

async function callAI(params: {
  model: string;
  system?: string;
  messages: Array<{ role: string; content: unknown }>;
  maxTokens?: number;
}): Promise<string> {
  const res = await fetch("/api/ai", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: params.model,
      system: params.system,
      messages: params.messages,
      max_tokens: params.maxTokens ?? 1024,
    }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || "AI request failed");
  }
  return data.text;
}
