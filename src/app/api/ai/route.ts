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

  // Server-env only — clients must NOT supply their own key.
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return Response.json(
      { error: "AI is not configured. Set ANTHROPIC_API_KEY in environment variables." },
      { status: 500 }
    );
  }

  let body: {
    model: string;
    system?: string;
    messages: Array<{ role: string; content: unknown }>;
    max_tokens?: number;
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
        max_tokens: maxTokens,
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
