import robots, { CONTENT_SIGNAL, type RobotsRule } from "@/lib/seo/robots-policy";

/**
 * robots.txt is ours (owner decision 2026-10-29: search engines and AI crawlers may read every public page).
 * Cloudflare's managed robots.txt must stay off (tools/ops/cf/50-ai-crawlers-*.sh), otherwise it prepends its
 * own groups that block GPTBot, ClaudeBot, Google-Extended and others. Signed-in areas and /api stay disallowed.
 */
export function renderRobots(): string {
  const policy = robots();
  const group = (rule: RobotsRule) => [
    ...([] as string[]).concat(rule.userAgent).map((ua) => `User-agent: ${ua}`),
    `Content-Signal: ${CONTENT_SIGNAL}`,
    ...(rule.allow ?? []).map((p) => `Allow: ${p}`),
    ...(rule.disallow ?? []).map((p) => `Disallow: ${p}`),
  ].join("\n");
  return [
    "# Nabd Plus. Public pages may be crawled, indexed, quoted by AI assistants and used for AI training.",
    "# Content-Signal (contentsignals.org): search=yes, ai-input=yes, ai-train=yes. Signed-in areas and /api are not public.",
    "# AI assistants can also order through our MCP server: https://nabd.plus/llms.txt",
    "",
    policy.rules.map(group).join("\n\n"),
    "",
    `Sitemap: ${policy.sitemap}`,
    "",
  ].join("\n");
}

export function GET() {
  return new Response(renderRobots(), {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
