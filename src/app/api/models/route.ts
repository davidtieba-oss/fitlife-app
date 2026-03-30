export async function GET(request: Request) {
  const apiKey =
    process.env.ANTHROPIC_API_KEY || request.headers.get("x-api-key");
  if (!apiKey) {
    return Response.json(
      { error: "No API key available" },
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
