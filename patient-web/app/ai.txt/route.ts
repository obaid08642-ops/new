export async function GET() {
  const body = [
    "# Nabd Plus — AI usage",
    "Preferred machine-readable catalog: /llms.txt",
    "Agent discovery: /.well-known/ai-catalog.json, /.well-known/agent-card.json, /openapi.json",
    "Public indexable surfaces are listed in /llms.txt and /sitemap.xml.",
    "No public OAuth/OIDC/MCP write access. Private patient APIs require session cookies.",
  ].join("\n");
  return new Response(`${body}\n`, {
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "public, max-age=3600",
    },
  });
}
