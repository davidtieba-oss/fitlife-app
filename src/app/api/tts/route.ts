// TTS proxy for Mistral Voxtral.
// Accepts { text, voice } and returns { audio_data: base64Mp3 }.
// `voice` is the Mistral voice id (e.g. "casual_male") — see /api/tts/voices.
// Note: Voxtral's /v1/audio/speech derives the language from the voice's
// `languages` metadata, so we don't send a `language` field (it's rejected
// as `extra_forbidden`).

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

    // Convert binary audio to base64.
    const buf = new Uint8Array(await response.arrayBuffer());
    let binary = "";
    for (let i = 0; i < buf.length; i++) binary += String.fromCharCode(buf[i]);
    const audio_data = btoa(binary);

    return Response.json({
      audio_data,
      mime_type: "audio/mpeg",
      chars: text.length,
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
