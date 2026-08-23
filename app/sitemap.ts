import type { MetadataRoute } from "next";
import { locales } from "@/lib/i18n";
import { localizedUrl } from "@/lib/seo";

export default function sitemap(): MetadataRoute.Sitemap {
  return locales.flatMap((locale) => [
    { url: localizedUrl(locale), changeFrequency: "weekly", priority: 1 },
    { url: localizedUrl(locale, "/articles"), changeFrequency: "daily", priority: 0.8 },
  ]);
}
