const SYSTEM_PROMPT = `You are a nutrition estimation assistant. Given a food description or photo, estimate the nutritional content of each food item. Return ONLY valid JSON with this exact format, no other text:
{"foods":[{"name":"string","calories":number,"protein_g":number,"carbs_g":number,"fat_g":number}],"total":{"calories":number,"protein_g":number,"carbs_g":number,"fat_g":number},"portion_note":"string"}
Be realistic with portion sizes. If uncertain, provide your best estimate and note it in portion_note.`;

export async function POST(request: Request) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return Response.json(
      { error: "ANTHROPIC_API_KEY is not configured. Add it to .env.local" },
      { status: 500 }
    );
  }

  let body: { type: "text" | "image"; content: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (!body.content || !body.type) {
    return Response.json({ error: "Missing type or content" }, { status: 400 });
  }

  // Build message content based on type
  let userContent: unknown;
  if (body.type === "text") {
    userContent = `Estimate the nutritional content of this meal: ${body.content}`;
  } else {
    // Image: extract media type and base64 data from data URL
    const match = body.content.match(/^data:(image\/\w+);base64,(.+)$/);
    if (!match) {
      return Response.json({ error: "Invalid image data URL" }, { status: 400 });
    }
    const [, mediaType, data] = match;
    userContent = [
      {
        type: "image",
        source: { type: "base64", media_type: mediaType, data },
      },
      {
        type: "text",
        text: "Look at this photo of food. Estimate the portion sizes and nutritional content. Return ONLY valid JSON with the format specified.",
      },
    ];
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
        model: "claude-sonnet-4-20250514",
        max_tokens: 1024,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: userContent }],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      return Response.json(
        { error: `API error: ${response.status} — ${errText}` },
        { status: 502 }
      );
    }

    const data = await response.json();
    const text = data.content?.[0]?.text ?? "";

    // Extract JSON from the response (handle potential markdown wrapping)
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return Response.json(
        { error: "Could not parse nutrition data from AI response" },
        { status: 502 }
      );
    }

    const estimate = JSON.parse(jsonMatch[0]);
    return Response.json(estimate);
  } catch (err) {
    return Response.json(
      { error: `Failed to estimate meal: ${err instanceof Error ? err.message : "Unknown error"}` },
      { status: 500 }
    );
  }
}
