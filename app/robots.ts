import type { MetadataRoute } from "next";
import { locales } from "@/lib/i18n";
import { siteOrigin } from "@/lib/seo";

export default function robots(): MetadataRoute.Robots {
  const privateRouteFamilies = ["login", "dashboard", "orders", "appointments", "diagnostics", "home-care", "family", "chat", "notifications", "health", "prescriptions", "reminders", "profile", "medicines", "medicine-catalog"];
  const privatePaths = ["/api/", ...locales.flatMap((locale) => privateRouteFamilies.map((route) => `/${locale}/${route}`))];

  return { rules: { userAgent: "*", allow: "/", disallow: privatePaths }, sitemap: `${siteOrigin()}/sitemap.xml` };
}
