import {
  MAX_BODY_BYTES,
  validateAiRequest,
} from "@/lib/ai-validation";

// Single-instance in-memory rate limiter. For multi-instance deployments,
// swap for Upstash Redis or Vercel KV with the same sliding-window shape.
const RATE_WINDOW_MS = 60_000;
const RATE_MAX = 20;
const rateBuckets = new Map<string, number[]>();

function getClientIp(request: Request): string {
  const fwd = request.headers.get("x-forwarded-for");
  if (fwd) {
    const first = fwd.split(",")[0]?.trim();
    if (first) return first;
  }
  const real = request.headers.get("x-real-ip");
  if (real) return real.trim();
  return "unknown";
}

function getAllowedOrigins(): Set<string> {
  const set = new Set<string>();
  const env = process.env.ALLOWED_ORIGINS;
  if (env) {
    for (const o of env.split(",")) {
      const trimmed = o.trim();
      if (trimmed) set.add(trimmed);
    }
  }
  if (process.env.VERCEL_URL) {
    set.add(`https://${process.env.VERCEL_URL}`);
  }
  return set;
}

function isOriginAllowed(request: Request): boolean {
  if (request.headers.get("sec-fetch-site") === "same-origin") return true;
  const origin = request.headers.get("origin");
  if (!origin) return false;
  return getAllowedOrigins().has(origin);
}

function rateLimit(ip: string): { ok: true } | { ok: false; retryAfter: number } {
  const now = Date.now();
  const windowStart = now - RATE_WINDOW_MS;
  const hits = rateBuckets.get(ip) ?? [];
  const recent = hits.filter((t) => t > windowStart);
  if (recent.length >= RATE_MAX) {
    const oldest = recent[0];
    const retryAfter = Math.max(1, Math.ceil((oldest + RATE_WINDOW_MS - now) / 1000));
    rateBuckets.set(ip, recent);
    return { ok: false, retryAfter };
  }
  recent.push(now);
  rateBuckets.set(ip, recent);
  return { ok: true };
}

function warn(event: string, ip: string, reason: string, status: number): void {
  console.warn(JSON.stringify({ event, ip, reason, status }));
}

export async function POST(request: Request) {
  const ip = getClientIp(request);

  if (!isOriginAllowed(request)) {
    warn("origin_denied", ip, "origin not allowed", 403);
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const contentLength = Number(request.headers.get("content-length") ?? "0");
  if (Number.isFinite(contentLength) && contentLength > MAX_BODY_BYTES) {
    warn("payload_too_large", ip, `content-length ${contentLength}`, 413);
    return Response.json({ error: "Payload too large" }, { status: 413 });
  }

  const rl = rateLimit(ip);
  if (!rl.ok) {
    warn("rate_limited", ip, `>${RATE_MAX}/${RATE_WINDOW_MS}ms`, 429);
    return Response.json(
      { error: "Too many requests" },
      { status: 429, headers: { "Retry-After": String(rl.retryAfter) } }
    );
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    warn("not_configured", ip, "ANTHROPIC_API_KEY missing", 500);
    return Response.json(
      { error: "AI is not configured. Set ANTHROPIC_API_KEY in environment variables." },
      { status: 500 }
    );
  }

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    warn("invalid_json", ip, "JSON parse failed", 400);
    return Response.json({ error: "Invalid request body" }, { status: 400 });
  }

  const result = validateAiRequest(raw);
  if (!result.ok) {
    warn("invalid_request", ip, `${result.field}: ${result.reason}`, 400);
    return Response.json(
      { error: `Invalid ${result.field}: ${result.reason}` },
      { status: 400 }
    );
  }
  const { model, system, messages, max_tokens } = result.value;

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({ model, max_tokens, system, messages }),
    });

    if (!response.ok) {
      const errText = await response.text();
      const status = response.status === 401 ? 401 : 502;
      warn("upstream_error", ip, `upstream ${response.status}`, status);
      return Response.json(
        { error: `API error: ${response.status} — ${errText}` },
        { status }
      );
    }

    const data = await response.json();
    const text = data.content?.[0]?.text ?? "";
    return Response.json({ text });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    warn("fetch_failed", ip, msg, 500);
    return Response.json({ error: `Request failed: ${msg}` }, { status: 500 });
  }
}
