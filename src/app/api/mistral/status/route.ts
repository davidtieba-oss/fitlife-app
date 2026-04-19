// Cheap env probe — no upstream call, no guard required.

export async function GET() {
  return Response.json({ configured: Boolean(process.env.MISTRAL_API_KEY) });
}
