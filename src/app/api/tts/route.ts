// TTS proxy for Mistral Voxtral.
// Accepts { text, voice } and returns binary audio (audio/mpeg).
// `voice` is a Mistral voice id — see /api/tts/voices.
// Voxtral derives language from the voice metadata, so no `language` field.

export async function POST(request: Request) {
  const apiKey = process.env.MISTRAL_API_KEY;
  if (!apiKey) {
    return Response.json(
      { error: "Mistral is not configured. Set MISTRAL_API_KEY in environment variables." },
      { status: 401 }
    );
  }

  let body: { text?: string; voice?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request body" }, { status: 400 });
  }

  const text = (body.text ?? "").trim();
  const voice = body.voice ?? "";

  if (!text) {
    return Response.json({ error: "Missing required field: text" }, { status: 400 });
  }
  if (!voice) {
    return Response.json(
      { error: "Missing required field: voice. Pick a voice in Settings first." },
      { status: 400 }
    );
  }
  if (text.length > 5000) {
    return Response.json(
      { error: "Text too long — split into chunks before calling TTS" },
      { status: 400 }
    );
  }

  try {
    const response = await fetch("https://api.mistral.ai/v1/audio/speech", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "voxtral-mini-tts-2603",
        voice,
        input: text,
        response_format: "mp3",
      }),
    });

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

    // Mistral may return raw binary audio OR a JSON envelope depending on the
    // deployment. Inspect content-type before deciding how to forward.
    const contentType = response.headers.get("content-type") ?? "";

    if (contentType.includes("application/json")) {
      const json = await response.json();
      const b64: string | undefined =
        json?.audio ??
        json?.audio_data ??
        json?.data?.[0]?.b64_json ??
        json?.data?.[0]?.audio;
      if (!b64) {
        return Response.json(
          {
            error: `TTS returned unexpected JSON: ${JSON.stringify(json).slice(0, 400)}`,
          },
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

    const buf = new Uint8Array(await response.arrayBuffer());
    return new Response(buf, {
      status: 200,
      headers: {
        "Content-Type": contentType || "audio/mpeg",
        "Content-Length": String(buf.byteLength),
        "X-Tts-Chars": String(text.length),
      },
    });
  } catch (err) {
    return Response.json(
      {
        error: `TTS request failed: ${
          err instanceof Error ? err.message : "Unknown error"
        }`,
      },
      { status: 500 }
    );
  }
}
