export const MAX_TOKENS_CAP = 2048;
export const MAX_MESSAGES = 50;
export const MAX_SYSTEM_BYTES = 4 * 1024;
export const MAX_TOTAL_INPUT_BYTES = 32 * 1024;
export const MAX_BODY_BYTES = 64 * 1024;

const MODEL_ID_RE = /^claude-[a-z0-9.\-]{1,60}$/;

export function isValidModelId(v: unknown): v is string {
  return typeof v === "string" && MODEL_ID_RE.test(v);
}

export interface ValidatedMessage {
  role: "user" | "assistant";
  content: string | unknown[];
}

export interface ValidatedBody {
  model: string;
  system?: string;
  messages: ValidatedMessage[];
  max_tokens: number;
}

export type ValidationResult =
  | { ok: true; value: ValidatedBody }
  | { ok: false; field: string; reason: string };

const encoder = new TextEncoder();

function byteLength(s: string): number {
  return encoder.encode(s).length;
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

export function validateAiRequest(raw: unknown): ValidationResult {
  if (!isPlainObject(raw)) {
    return { ok: false, field: "body", reason: "must be an object" };
  }

  if (!isValidModelId(raw.model)) {
    return { ok: false, field: "model", reason: "must match /^claude-[a-z0-9.\\-]{1,60}$/" };
  }
  const model = raw.model;

  let system: string | undefined;
  if (raw.system !== undefined) {
    if (typeof raw.system !== "string") {
      return { ok: false, field: "system", reason: "must be a string" };
    }
    if (byteLength(raw.system) > MAX_SYSTEM_BYTES) {
      return { ok: false, field: "system", reason: `exceeds ${MAX_SYSTEM_BYTES} bytes` };
    }
    system = raw.system;
  }

  if (!Array.isArray(raw.messages)) {
    return { ok: false, field: "messages", reason: "must be an array" };
  }
  if (raw.messages.length === 0) {
    return { ok: false, field: "messages", reason: "must not be empty" };
  }
  if (raw.messages.length > MAX_MESSAGES) {
    return { ok: false, field: "messages", reason: `exceeds ${MAX_MESSAGES} entries` };
  }

  const messages: ValidatedMessage[] = [];
  for (let i = 0; i < raw.messages.length; i++) {
    const m = raw.messages[i];
    if (!isPlainObject(m)) {
      return { ok: false, field: `messages[${i}]`, reason: "must be an object" };
    }
    if (m.role !== "user" && m.role !== "assistant") {
      return { ok: false, field: `messages[${i}].role`, reason: 'must be "user" or "assistant"' };
    }
    if (typeof m.content !== "string" && !Array.isArray(m.content)) {
      return { ok: false, field: `messages[${i}].content`, reason: "must be a string or array" };
    }
    messages.push({ role: m.role, content: m.content as string | unknown[] });
  }

  let max_tokens = 1024;
  if (raw.max_tokens !== undefined) {
    if (
      typeof raw.max_tokens !== "number" ||
      !Number.isInteger(raw.max_tokens) ||
      raw.max_tokens <= 0
    ) {
      return { ok: false, field: "max_tokens", reason: "must be a positive integer" };
    }
    max_tokens = Math.min(raw.max_tokens, MAX_TOKENS_CAP);
  }

  const serialized = JSON.stringify({ system, messages });
  if (byteLength(serialized) > MAX_TOTAL_INPUT_BYTES) {
    return {
      ok: false,
      field: "messages",
      reason: `total input exceeds ${MAX_TOTAL_INPUT_BYTES} bytes`,
    };
  }

  return { ok: true, value: { model, system, messages, max_tokens } };
}
