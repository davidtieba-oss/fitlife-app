/**
 * Shared API guard: per-IP rate limiting, origin gating, payload capping.
 *
 * NOTE: Rate-limit state is in-process memory. On multi-instance deployments
 * (scaled-out Vercel, etc.) each instance maintains its own counter, so the
 * effective limit is RATE_LIMIT_MAX * numInstances. A v2 upgrade should back
 * this with an edge KV store (Vercel KV, Upstash Redis, etc.).
 */

// ── Config (all overridable via env) ──────────────────────────────────────────

/** Max requests per IP per window. */
const RATE_LIMIT_MAX = parseInt(process.env.RATE_LIMIT_MAX ?? "20", 10);
/** Sliding-window length in ms (default 1 min). */
const RATE_LIMIT_WINDOW_MS = parseInt(process.env.RATE_LIMIT_WINDOW_MS ?? "60000", 10);
/** Max request body in bytes (default 512 KB). */
const MAX_BODY_BYTES = parseInt(process.env.MAX_BODY_BYTES ?? String(512 * 1024), 10);

/** Hard ceiling for max_tokens forwarded to any model API. */
export const MAX_TOKENS_CAP = parseInt(process.env.MAX_TOKENS_CAP ?? "4096", 10);
/** Hard ceiling for total message text characters forwarded to any model API. */
export const MAX_TEXT_CHARS = parseInt(process.env.MAX_TEXT_CHARS ?? "32000", 10);
/** Hard ceiling for TTS input characters (tighter than MAX_TEXT_CHARS). */
export const MAX_TTS_CHARS = parseInt(process.env.MAX_TTS_CHARS ?? "4000", 10);
/** Max audio upload size for transcription in bytes (default 10 MB). */
export const MAX_AUDIO_BYTES = parseInt(process.env.MAX_AUDIO_BYTES ?? String(10 * 1024 * 1024), 10);

// ── Sliding-window rate limiter ───────────────────────────────────────────────

/** Maps client IP → sorted array of request timestamps (ms epoch). */
const ipWindows = new Map<string, number[]>();

function getClientIp(request: Request): string {
  const xff = request.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return "unknown";
}

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const cutoff = now - RATE_LIMIT_WINDOW_MS;
  const prev = (ipWindows.get(ip) ?? []).filter((t) => t > cutoff);
  if (prev.length >= RATE_LIMIT_MAX) {
    ipWindows.set(ip, prev);
    return true;
  }
  prev.push(now);
  ipWindows.set(ip, prev);
  return false;
}

// ── Origin check ─────────────────────────────────────────────────────────────
//
// Browsers vary on whether same-origin GETs get an `Origin` header (Safari
// often omits it), and Vercel/CDN proxies rewrite `host` so comparing
// `Origin.host === host` fails behind a custom domain. Use the browser-
// enforced Sec-Fetch-Site signal when present, then fall back to matching
// Origin against both `host` and `x-forwarded-host`.

function isOriginAllowed(request: Request): boolean {
  // Primary signal: Sec-Fetch-Site is set by modern browsers on every fetch
  // and cannot be forged from a cross-origin page. Fetch-spec values are
  // "same-origin" | "same-site" | "cross-site" | "none".
  const fetchSite = request.headers.get("sec-fetch-site");
  if (fetchSite === "same-origin" || fetchSite === "same-site") return true;
  if (fetchSite === "cross-site") return false;

  const origin = request.headers.get("origin");
  if (!origin) {
    // No Origin and no Sec-Fetch-Site — non-browser client (curl, server-to-
    // server) or same-origin GET in a browser that omits Origin. Allow in
    // dev; deny in prod.
    return process.env.NODE_ENV !== "production";
  }

  let originHost: string;
  try {
    originHost = new URL(origin).host;
  } catch {
    return false;
  }

  const host = request.headers.get("host") ?? "";
  const forwardedHost = request.headers.get("x-forwarded-host") ?? "";
  return originHost === host || originHost === forwardedHost;
}

// ── Content-Length pre-check ─────────────────────────────────────────────────

function isContentLengthOk(request: Request, limit = MAX_BODY_BYTES): boolean {
  const cl = request.headers.get("content-length");
  if (!cl) return true; // chunked encoding — enforced during streaming read
  const bytes = parseInt(cl, 10);
  return isNaN(bytes) || bytes <= limit;
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Run all three guards. Returns a structured error Response if any guard
 * fires, or null if the request may proceed.
 *
 * @param bodyLimit  Override the body byte limit for this call (e.g. audio routes).
 */
export async function guardRequest(
  request: Request,
  bodyLimit = MAX_BODY_BYTES,
): Promise<Response | null> {
  if (!isOriginAllowed(request)) {
    return Response.json(
      { error: "Forbidden: request origin not allowed" },
      { status: 403 },
    );
  }
  if (!isContentLengthOk(request, bodyLimit)) {
    return Response.json({ error: "Payload too large" }, { status: 413 });
  }
  if (isRateLimited(getClientIp(request))) {
    return Response.json(
      { error: "Too many requests — please slow down" },
      { status: 429 },
    );
  }
  return null;
}

/**
 * Stream-read the request body, enforcing a byte cap, then JSON-parse it.
 *
 * Throws `{ status: number; message: string }` on error — catch and convert
 * to a Response in the route handler.
 */
export async function readJsonBody(
  request: Request,
  limit = MAX_BODY_BYTES,
): Promise<unknown> {
  const reader = request.body?.getReader();
  if (!reader) throw { status: 400, message: "Empty request body" };

  const chunks: Uint8Array[] = [];
  let totalBytes = 0;

  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      totalBytes += value.byteLength;
      if (totalBytes > limit) {
        throw { status: 413, message: "Payload too large" };
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  const buf = new Uint8Array(totalBytes);
  let off = 0;
  for (const c of chunks) {
    buf.set(c, off);
    off += c.byteLength;
  }

  try {
    return JSON.parse(new TextDecoder().decode(buf));
  } catch {
    throw { status: 400, message: "Invalid JSON body" };
  }
}

/** Convenience: turn a caught guard error into a Response. */
export function guardErrResponse(e: unknown): Response {
  const err = e as { status?: number; message?: string };
  return Response.json(
    { error: err.message ?? "Bad request" },
    { status: err.status ?? 400 },
  );
}
