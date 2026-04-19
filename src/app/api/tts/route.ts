// Mistral Voxtral TTS proxy.
//
// POSTURE — see AGENTS.md "tts-posture" before editing:
//   - model: voxtral-mini-tts-2603 (hard-coded; voxtral-tts / voxtral-tts-2603
//     return invalid_model)
//   - no `language` field (Voxtral derives language from voice metadata and
//     rejects `language` as extra_forbidden)
//   - voice: forwarded from client; catalog comes from /api/tts/voices —
//     do NOT hardcode voice ids here
//   - response: dual binary OR JSON envelope. Some deployments return raw
//     audio/mpeg, others return application/json with a base64 audio field.
//     Guessing wrong silently mangles the body and the browser fails with
//     "no supported source was found".

import {
  guardRequest,
  guardErrResponse,
  readJsonBody,
  MAX_TTS_CHARS,
} from "@/lib/api-guard";

const VOXTRAL_MODEL = "voxtral-mini-tts-2603";

export async function POST(request: Request) {
  const guard = await guardRequest(request);
  if (guard) return guard;

  const apiKey = process.env.MISTRAL_API_KEY;
  if (!apiKey) {
    return Response.json(
      { error: "Mistral is not configured. Set MISTRAL_API_KEY in environment variables." },
      { status: 401 }
    );
  }

  let body: { text?: string; voice?: string };
  try {
    body = (await readJsonBody(request)) as typeof body;
  } catch (e) {
    return guardErrResponse(e);
  }

  const text = (body.text ?? "").trim();
  const voice = body.voice;

  if (!text) {
    return Response.json({ error: "Missing required field: text" }, { status: 400 });
  }
  if (text.length > MAX_TTS_CHARS) {
    return Response.json(
      { error: `Text too long for TTS (max ${MAX_TTS_CHARS} chars) — split into chunks before calling` },
      { status: 413 }
    );
  }

  const mistralBody: { model: string; input: string; voice?: string; response_format: string } = {
    model: VOXTRAL_MODEL,
    input: text,
    response_format: "mp3",
    // NOTE: `language` intentionally omitted — see file header.
  };
  if (voice) mistralBody.voice = voice;

  let response: Response;
  try {
    response = await fetch("https://api.mistral.ai/v1/audio/speech", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(mistralBody),
    });
  } catch (err) {
    return Response.json(
      { error: `TTS request failed: ${err instanceof Error ? err.message : "Unknown error"}` },
      { status: 502 }
    );
  }

  if (response.status === 429) {
    const retryAfter = response.headers.get("retry-after") ?? "";
    return Response.json(
      { error: "Mistral TTS rate limit reached — try again shortly." },
      { status: 429, headers: retryAfter ? { "retry-after": retryAfter } : undefined }
    );
  }

  if (!response.ok) {
    const errText = await response.text();
    const status = response.status === 401 ? 401 : 502;
    return Response.json(
      { error: `TTS error: ${response.status} — ${errText}` },
      { status }
    );
  }

  const contentType = response.headers.get("content-type") ?? "";

  // JSON envelope path — extract base64 audio and re-emit as binary mp3 so the
  // client's res.blob() call gets a playable Blob.
  if (contentType.includes("application/json")) {
    const json = await response.json();
    const b64: string | undefined =
      json?.audio ??
      json?.audio_data ??
      json?.data?.[0]?.b64_json ??
      json?.data?.[0]?.audio;
    if (!b64) {
      return Response.json(
        { error: `TTS returned unexpected JSON: ${JSON.stringify(json).slice(0, 400)}` },
        { status: 502 }
      );
    }
    const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
    return new Response(bytes, {
      status: 200,
      headers: {
        "Content-Type": "audio/mpeg",
        "Content-Length": String(bytes.byteLength),
        "X-Tts-Chars": String(text.length),
      },
    });
  }

  // Binary path — pass bytes through with upstream mime.
  const buf = new Uint8Array(await response.arrayBuffer());
  return new Response(buf, {
    status: 200,
    headers: {
      "Content-Type": contentType || "audio/mpeg",
      "Content-Length": String(buf.byteLength),
      "X-Tts-Chars": String(text.length),
    },
  });
}
