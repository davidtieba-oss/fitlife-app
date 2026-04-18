export async function GET() {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return Response.json(
      { error: "Anthropic is not configured. Set ANTHROPIC_API_KEY in environment variables." },
      { status: 401 }
    );
  }

  try {
    const response = await fetch("https://api.anthropic.com/v1/models", {
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
    });

    if (!response.ok) {
      const errText = await response.text();
      return Response.json(
        { error: `API error: ${response.status} — ${errText}` },
        { status: response.status === 401 ? 401 : 502 }
      );
    }

    const data = await response.json();
    return Response.json(data);
  } catch (err) {
    return Response.json(
      { error: `Request failed: ${err instanceof Error ? err.message : "Unknown error"}` },
      { status: 500 }
    );
  }
}
