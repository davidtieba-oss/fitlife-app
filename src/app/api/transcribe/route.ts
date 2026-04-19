// Mistral voice transcription proxy.
//
// Body-size is gated by Content-Length (MAX_AUDIO_BYTES) before the upload
// is read. Response shape MUST stay { text, language } — VoiceInput reads
// data.text and the language echo helps the client confirm what Voxtral
// actually used.
//
// Model is the transcription model voxtral-mini-latest — NOT the TTS
// model voxtral-mini-tts-2603. Mixing them up returns invalid_model.

import { guardRequest, MAX_AUDIO_BYTES } from "@/lib/api-guard";

const TRANSCRIBE_MODEL = "voxtral-mini-latest";

export async function POST(request: Request) {
  // Audio uploads can be larger than the default JSON body cap.
  const guard = await guardRequest(request, MAX_AUDIO_BYTES);
  if (guard) return guard;

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
    return Response.json({ error: "Expected multipart/form-data body" }, { status: 400 });
  }

  const audioFile = formData.get("audio");
  if (!(audioFile instanceof Blob)) {
    return Response.json({ error: "Missing audio file" }, { status: 400 });
  }

  // Catches chunked uploads that bypass Content-Length.
  if (audioFile.size > MAX_AUDIO_BYTES) {
    return Response.json(
      { error: `Audio file too large (max ${MAX_AUDIO_BYTES / (1024 * 1024)} MB)` },
      { status: 413 }
    );
  }

  const rawLanguage = formData.get("language");
  const language =
    typeof rawLanguage === "string" && rawLanguage.length > 0 ? rawLanguage : "en";

  const mistralForm = new FormData();
  mistralForm.append("file", audioFile, "recording.webm");
  mistralForm.append("model", TRANSCRIBE_MODEL);
  if (language !== "auto") {
    mistralForm.append("language", language);
  }

  try {
    const response = await fetch("https://api.mistral.ai/v1/audio/transcriptions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        // Do NOT set Content-Type — let fetch set it with boundary.
      },
      body: mistralForm,
    });

    if (!response.ok) {
      const details = await response.text();
      return Response.json({ error: "Transcription failed", details }, { status: 500 });
    }

    const data = await response.json();
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
