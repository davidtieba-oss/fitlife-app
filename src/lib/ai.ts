import { getAiSettings, defaultModelFor, type AIProvider } from "./ai-providers";

interface AskAIOptions {
  system?: string;
  userMessage: string;
  /** Base64 data-URL of an image. When present, always routes to Anthropic. */
  image?: string;
  maxTokens?: number;
  /** Override the provider chosen in settings. Ignored when `image` is set. */
  provider?: AIProvider;
  /** Override the model for the resolved provider. */
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
    // Vision is Anthropic-only — use the anthropic model from settings if
    // already on anthropic, otherwise fall back to the anthropic default.
    const model =
      settings.provider === "anthropic"
        ? settings.model
        : defaultModelFor("anthropic");
    return { provider: "anthropic", model };
  }
  const provider = opts.provider ?? settings.provider;
  const model =
    opts.model ??
    (provider === settings.provider
      ? settings.model
      : defaultModelFor(provider));
  return { provider, model };
}

/**
 * Send a single user message (with optional image) to the AI.
 * Reads provider + model from localStorage AI settings by default.
 * Image prompts are always routed to Anthropic.
 */
export async function askAI(options: AskAIOptions): Promise<string> {
  const { system, userMessage, image, maxTokens } = options;
  const { provider, model } = resolveRoute({
    provider: options.provider,
    model: options.model,
    hasImage: Boolean(image),
  });

  if (provider === "anthropic") {
    let content: unknown;
    if (image) {
      const match = image.match(/^data:(image\/\w+);base64,(.+)$/);
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
