import { locales } from "@/lib/i18n";
import { siteOrigin } from "@/lib/seo";

export type RobotsRule = { userAgent: string | string[]; allow?: string[]; disallow?: string[] };
export type RobotsPolicy = { rules: RobotsRule[]; sitemap: string };

/** Owner decision 2026-10-29: every search and AI crawler may read the public pages (search, answers and training). */
export const AI_CRAWLERS = [
  "GPTBot", "ChatGPT-User", "OAI-SearchBot", "ClaudeBot", "Claude-SearchBot", "Claude-User", "anthropic-ai", "PerplexityBot", "Perplexity-User",
  "Google-Extended", "Googlebot", "Amazonbot", "Applebot", "Applebot-Extended", "Bingbot", "CCBot", "meta-externalagent", "meta-externalfetcher",
  "FacebookBot", "Bytespider", "Diffbot", "cohere-ai", "MistralAI-User", "DuckAssistBot", "YouBot", "omgili",
];

/** Content Signals (contentsignals.org): the site grants search, AI answers (ai-input) and AI training. */
export const CONTENT_SIGNAL = "search=yes, ai-input=yes, ai-train=yes";

export default function robots(): RobotsPolicy {
  // Auth-gated trees (whole families) — patient areas must never be indexed.
  const privateTreeFamilies = [
    "login", "register", "forgot-password", "password-reset", "otp",
    "dashboard", "orders", "appointments", "chat", "notifications", "health",
    "prescriptions", "reminders", "profile", "wishlist", "wallet", "reports",
    "programs", "returns", "support", "family", "offers",
    "emergency", "cart", "settings", "home-care", "insurance",
  ];
  // Private leaf paths under otherwise public trees (a prefix disallow would
  // also block their public siblings, so they are listed exactly).
  const privateLeafSuffixes = [
    "/diagnostics", // index requires auth; labs/radiology/packages below stay crawlable
    "/nursing/visits", // bookings require auth; /nursing/catalog stays crawlable
    "/consultations/share-report",
    "/consultations/video-call",
  ];
  // Public children below the auth-gated /diagnostics index must stay crawlable.
  const publicExplicitAllows = locales.flatMap((locale) =>
    // the public home-care service pages sit under the private /home-care tree
    ["/diagnostics/labs", "/diagnostics/radiology", "/diagnostics/packages", "/home-care/services/"].map((path) => `/${locale}${path}`),
  );

  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", ...publicExplicitAllows],
        disallow: [
          "/api/",
          ...locales.flatMap((locale) => [
            ...privateTreeFamilies.map((route) => `/${locale}/${route}`),
            ...privateLeafSuffixes.map((suffix) => `/${locale}${suffix}`),
          ]),
        ],
      },
      // R56 AI discovery: known AI assistants/crawlers get the SAME public
      // surface (never the private trees). Explicit entry so AI bots do not
      // have to infer permissions from the wildcard rule.
      {
        userAgent: AI_CRAWLERS,
        allow: ["/", "/llms.txt", ...publicExplicitAllows],
        disallow: [
          "/api/",
          ...locales.flatMap((locale) => [
            ...privateTreeFamilies.map((route) => `/${locale}/${route}`),
            ...privateLeafSuffixes.map((suffix) => `/${locale}${suffix}`),
          ]),
        ],
      },
    ],
    sitemap: `${siteOrigin()}/sitemap.xml`,
  };
}
