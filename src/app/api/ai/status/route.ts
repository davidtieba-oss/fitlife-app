// Capability probe: reports which provider keys are configured server-side.
// The client uses this to gate UI (e.g. coach, Listen button) without ever
// seeing the secret itself.

export const dynamic = "force-dynamic";

export async function GET() {
  return Response.json({
    anthropic: !!process.env.ANTHROPIC_API_KEY,
    mistral: !!process.env.MISTRAL_API_KEY,
  });
}
