import type { MetadataRoute } from "next";
import { locales } from "@/lib/i18n";
import { siteOrigin } from "@/lib/seo";

export default function robots(): MetadataRoute.Robots {
  // /{lang}/medicines/{id} and /{lang}/medicine-catalog stay crawlable: the
  // legacy URLs 301 to the canonical /{lang}/p/{slug} v14 product pages and
  // crawlers must be able to follow the redirect to transfer ranking signals.
  const privateRouteFamilies = ["login", "dashboard", "orders", "appointments", "diagnostics", "home-care", "family", "chat", "notifications", "health", "prescriptions", "reminders", "profile", "wishlist"];
  const privatePaths = ["/api/", ...locales.flatMap((locale) => privateRouteFamilies.map((route) => `/${locale}/${route}`))];

  return { rules: { userAgent: "*", allow: "/", disallow: privatePaths }, sitemap: `${siteOrigin()}/sitemap.xml` };
}
