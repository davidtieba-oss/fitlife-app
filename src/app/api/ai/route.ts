export async function POST(request: Request) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return Response.json(
      { error: "Anthropic is not configured. Set ANTHROPIC_API_KEY in environment variables." },
      { status: 401 }
    );
  }

  let body: {
    model: string;
    system?: string;
    messages: Array<{ role: string; content: unknown }>;
    max_tokens?: number;
  };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (!body.model || !body.messages || !Array.isArray(body.messages)) {
    return Response.json(
      { error: "Missing required fields: model, messages" },
      { status: 400 }
    );
  }

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: body.model,
        max_tokens: body.max_tokens ?? 1024,
        system: body.system,
        messages: body.messages,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      const status = response.status === 401 ? 401 : 502;
      return Response.json(
        { error: `API error: ${response.status} — ${errText}` },
        { status }
      );
    }

    const data = await response.json();
    const text = data.content?.[0]?.text ?? "";
    return Response.json({ text });
  } catch (err) {
    return Response.json(
      { error: `Request failed: ${err instanceof Error ? err.message : "Unknown error"}` },
      { status: 500 }
    );
  }
}
