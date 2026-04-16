export async function POST(request: Request) {
  const apiKey = process.env.MISTRAL_API_KEY;
  if (!apiKey) {
    return Response.json(
      { error: "Voice transcription is not configured" },
      { status: 500 }
    );
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return Response.json({ error: "Invalid request body" }, { status: 400 });
  }

  const audioFile = formData.get("audio");
  if (!(audioFile instanceof Blob)) {
    return Response.json({ error: "Missing audio file" }, { status: 400 });
  }

  const rawLanguage = formData.get("language");
  const language =
    typeof rawLanguage === "string" && rawLanguage.length > 0
      ? rawLanguage
      : "en";

  // Build multipart form data for Mistral
  const mistralForm = new FormData();
  mistralForm.append("file", audioFile, "recording.webm");
  mistralForm.append("model", "voxtral-mini-latest");
  if (language !== "auto") {
    mistralForm.append("language", language);
  }

  try {
    const response = await fetch(
      "https://api.mistral.ai/v1/audio/transcriptions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          // Do NOT set Content-Type — let fetch set it with boundary
        },
        body: mistralForm,
      }
    );

    if (!response.ok) {
      const details = await response.text();
      return Response.json(
        { error: "Transcription failed", details },
        { status: 500 }
      );
    }

    const data = await response.json();
    // Response shape: { model: string, text: string, language: string, segments?: [] }
    return Response.json({
      text: data.text ?? "",
      language: data.language ?? language,
    });
  } catch (err) {
    return Response.json(
      {
        error: "Transcription failed",
        details: err instanceof Error ? err.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
