export async function GET() {
  const configured = Boolean(process.env.MISTRAL_API_KEY);
  return Response.json({ configured });
}
