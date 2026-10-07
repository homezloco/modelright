// MCP registry domain-auth proof: the official registry fetches this path
// server-side and follows NO redirects. The record is public key material
// written by LiveGraph at publish time — safe to serve.
export const dynamic = "force-dynamic";

export function GET() {
  const record = process.env.MCP_REGISTRY_AUTH;
  if (!record) return new Response("not configured", { status: 404 });
  return new Response(record, {
    headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" },
  });
}
