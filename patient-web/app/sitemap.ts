import type { MetadataRoute } from "next";
import { locales } from "@/lib/i18n";
import { localizedUrl } from "@/lib/seo";

export default function sitemap(): MetadataRoute.Sitemap {
  // I: publish the public, login-free surfaces alongside each locale home.
  return locales.flatMap((locale) => [
    { url: localizedUrl(locale), changeFrequency: "weekly", priority: 1 },
    { url: localizedUrl(locale, "/medicine-catalog"), changeFrequency: "daily", priority: 0.8 },
    { url: localizedUrl(locale, "/specialties"), changeFrequency: "weekly", priority: 0.7 },
    { url: localizedUrl(locale, "/articles"), changeFrequency: "daily", priority: 0.6 },
  ]);
}
