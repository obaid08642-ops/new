import type { MetadataRoute } from "next";
import { localizedUrl } from "@/lib/seo";

export default function sitemap(): MetadataRoute.Sitemap {
  return (["ar", "en"] as const).flatMap((locale) => [
    { url: localizedUrl(locale), changeFrequency: "weekly", priority: 1 },
  ]);
}
