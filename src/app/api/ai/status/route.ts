export async function GET() {
  const configured = Boolean(process.env.ANTHROPIC_API_KEY);
  return Response.json({ configured });
}
