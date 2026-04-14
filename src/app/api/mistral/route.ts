export async function POST(request: Request) {
  const apiKey = process.env.MISTRAL_API_KEY;
  if (!apiKey) {
    return Response.json(
      { error: "Mistral is not configured. Set MISTRAL_API_KEY in environment variables." },
      { status: 500 }
    );
  }

  let body: {
    model: string;
    system?: string;
    messages: Array<{ role: string; content: string }>;
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

  // Mistral uses OpenAI-style messages — prepend `system` as a system message.
  const openaiMessages = body.system
    ? [{ role: "system", content: body.system }, ...body.messages]
    : body.messages;

  try {
    const response = await fetch("https://api.mistral.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: body.model,
        messages: openaiMessages,
        max_tokens: body.max_tokens ?? 1024,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      const status = response.status === 401 ? 401 : 502;
      return Response.json(
        { error: `Mistral API error: ${response.status} — ${errText}` },
        { status }
      );
    }

    const data = await response.json();
    const text: string = data.choices?.[0]?.message?.content ?? "";
    return Response.json({ text });
  } catch (err) {
    return Response.json(
      { error: `Request failed: ${err instanceof Error ? err.message : "Unknown error"}` },
      { status: 500 }
    );
  }
}
