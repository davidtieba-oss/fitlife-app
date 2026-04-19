import {
  guardRequest,
  guardErrResponse,
  readJsonBody,
  MAX_TOKENS_CAP,
  MAX_TEXT_CHARS,
} from "@/lib/api-guard";

export async function POST(request: Request) {
  const guard = await guardRequest(request);
  if (guard) return guard;

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
    temperature?: number;
  };
  try {
    body = (await readJsonBody(request)) as typeof body;
  } catch (e) {
    return guardErrResponse(e);
  }

  if (!body.model || !body.messages || !Array.isArray(body.messages)) {
    return Response.json(
      { error: "Missing required fields: model, messages" },
      { status: 400 }
    );
  }

  if (JSON.stringify(body.messages).length > MAX_TEXT_CHARS) {
    return Response.json({ error: "Message content too large" }, { status: 413 });
  }

  const maxTokens = Math.min(body.max_tokens ?? 1024, MAX_TOKENS_CAP);

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
        max_tokens: maxTokens,
        ...(body.temperature !== undefined && { temperature: body.temperature }),
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
