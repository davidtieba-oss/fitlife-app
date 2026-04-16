export async function POST(request: Request) {
  const apiKey = process.env.MISTRAL_API_KEY;
  if (!apiKey) {
    return Response.json(
      { error: "Mistral is not configured. Set MISTRAL_API_KEY in environment variables." },
      { status: 401 }
    );
  }

  let body: { text: string; voiceId?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (!body.text || typeof body.text !== "string") {
    return Response.json({ error: "Missing required field: text" }, { status: 400 });
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
        input: body.text,
        voice_id: body.voiceId,
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
        { error: `Mistral TTS error: ${response.status} — ${errText}` },
        { status }
      );
    }

    const data = await response.json();
    const audio: string | undefined = data.audio_data;
    if (!audio) {
      return Response.json(
        { error: "Mistral TTS returned an empty audio payload." },
        { status: 502 }
      );
    }

    return Response.json({ audio });
  } catch (err) {
    return Response.json(
      { error: `Request failed: ${err instanceof Error ? err.message : "Unknown error"}` },
      { status: 500 }
    );
  }
}
