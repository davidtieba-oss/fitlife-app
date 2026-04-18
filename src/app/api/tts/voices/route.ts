// Proxy for Mistral's GET /v1/audio/voices endpoint. Returns the raw
// paginated payload so the client can render the list dynamically.
// Required because the hardcoded voice ids we'd been shipping
// (Jessica/Laura/Jordan/Marcus) do not match any real Voxtral preset
// and Mistral rejects the TTS call with HTTP 404 `invalid_voice`.

export async function GET(request: Request) {
  const apiKey = process.env.MISTRAL_API_KEY;
  if (!apiKey) {
    return Response.json(
      { error: "Mistral is not configured. Set MISTRAL_API_KEY in environment variables." },
      { status: 401 }
    );
  }

  const { searchParams } = new URL(request.url);
  const limit = searchParams.get("limit") ?? "100";
  const offset = searchParams.get("offset") ?? "0";

  try {
    const response = await fetch(
      `https://api.mistral.ai/v1/audio/voices?limit=${encodeURIComponent(limit)}&offset=${encodeURIComponent(offset)}`,
      {
        headers: { Authorization: `Bearer ${apiKey}` },
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      return Response.json(
        { error: `Voices lookup failed: ${response.status} — ${errText}` },
        { status: response.status === 401 ? 401 : 502 }
      );
    }

    const data = await response.json();
    return Response.json(data);
  } catch (err) {
    return Response.json(
      {
        error: `Voices request failed: ${
          err instanceof Error ? err.message : "Unknown error"
        }`,
      },
      { status: 500 }
    );
  }
}
