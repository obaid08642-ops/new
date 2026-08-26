import type { MetadataRoute } from "next";
import { locales } from "@/lib/i18n";
import { siteOrigin } from "@/lib/seo";

export default function robots(): MetadataRoute.Robots {
  // I: medicine-catalog (public browse list) is indexable; per-medicine detail
  // stays noindex until the classified public DTO ships. Private families unchanged.
  const privateRouteFamilies = ["login", "dashboard", "orders", "appointments", "diagnostics", "home-care", "family", "chat", "notifications", "health", "prescriptions", "reminders", "profile", "medicines", "wishlist"];
  const privatePaths = ["/api/", ...locales.flatMap((locale) => privateRouteFamilies.map((route) => `/${locale}/${route}`))];

  return { rules: { userAgent: "*", allow: "/", disallow: privatePaths }, sitemap: `${siteOrigin()}/sitemap.xml` };
}
