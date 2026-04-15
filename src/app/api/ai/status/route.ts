export async function GET() {
  return Response.json({
    anthropic: Boolean(process.env.ANTHROPIC_API_KEY),
    mistral: Boolean(process.env.MISTRAL_API_KEY),
  });
}
