import { getAiSettings, type AIProvider } from "./ai-providers";

interface AskAIOptions {
  system?: string;
  userMessage: string;
  imageBase64?: string;
  maxTokens?: number;
  /** Override the provider chosen in settings. Ignored when `imageBase64` is set. */
  provider?: AIProvider;
  /** Override the model chosen for the active provider. */
  model?: string;
}

interface AskAIChatOptions {
  system?: string;
  messages: Array<{ role: "user" | "assistant"; content: string }>;
  maxTokens?: number;
  provider?: AIProvider;
  model?: string;
}

/**
 * Resolve which provider + model to use for a given call, respecting the
 * vision-only-on-Anthropic rule when an image is attached.
 */
function resolveRoute(opts: {
  provider?: AIProvider;
  model?: string;
  hasImage: boolean;
}): { provider: AIProvider; model: string } {
  const settings = getAiSettings();
  if (opts.hasImage) {
    return { provider: "anthropic", model: settings.anthropicModel };
  }
  const provider = opts.provider ?? settings.provider;
  const model =
    opts.model ??
    (provider === "mistral" ? settings.mistralModel : settings.anthropicModel);
  return { provider, model };
}

/**
 * Send a single user message (with optional image) to the AI.
 * Reads provider + model from localStorage AI settings by default.
 * Image prompts are always routed to Anthropic.
 */
export async function askAI(options: AskAIOptions): Promise<string> {
  const { system, userMessage, imageBase64, maxTokens } = options;
  const { provider, model } = resolveRoute({
    provider: options.provider,
    model: options.model,
    hasImage: Boolean(imageBase64),
  });

  if (provider === "anthropic") {
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
    return callAnthropic({
      model,
      system,
      messages: [{ role: "user", content }],
      maxTokens,
    });
  }

  // Mistral — text only (vision always falls back to Anthropic above).
  return callMistral({
    model,
    system,
    messages: [{ role: "user", content: userMessage }],
    maxTokens,
  });
}

/**
 * Send a multi-turn conversation to the AI.
 * Used by the coach for ongoing chat.
 */
export async function askAIChat(options: AskAIChatOptions): Promise<string> {
  const { system, messages, maxTokens } = options;
  const { provider, model } = resolveRoute({
    provider: options.provider,
    model: options.model,
    hasImage: false,
  });

  if (provider === "anthropic") {
    return callAnthropic({ model, system, messages, maxTokens });
  }
  return callMistral({ model, system, messages, maxTokens });
}

interface CallParams {
  model: string;
  system?: string;
  messages: Array<{ role: string; content: unknown }>;
  maxTokens?: number;
}

async function callAnthropic(params: CallParams): Promise<string> {
  return post("/api/ai", {
    model: params.model,
    system: params.system,
    messages: params.messages,
    max_tokens: params.maxTokens ?? 1024,
  });
}

async function callMistral(params: CallParams): Promise<string> {
  return post("/api/mistral", {
    model: params.model,
    system: params.system,
    messages: params.messages,
    max_tokens: params.maxTokens ?? 1024,
  });
}

async function post(url: string, body: unknown): Promise<string> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || "AI request failed");
  }
  return data.text;
}
