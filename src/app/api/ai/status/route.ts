// Health-check used by the client to decide which provider tabs to enable.
// Response shape MUST stay { anthropic, mistral } — see fetchAiStatus in
// src/lib/ai-providers.ts. This is a cheap env probe; no upstream call,
// so no rate-limit / origin guard needed.

export async function GET() {
  return Response.json({
    anthropic: Boolean(process.env.ANTHROPIC_API_KEY),
    mistral: Boolean(process.env.MISTRAL_API_KEY),
  });
}
