import type { MetadataRoute } from "next";
import { locales } from "@/lib/i18n";
import { siteOrigin } from "@/lib/seo";

export default function robots(): MetadataRoute.Robots {
  // Auth-gated trees (whole families) — patient areas must never be indexed.
  const privateTreeFamilies = [
    "login", "register", "forgot-password", "password-reset", "otp",
    "dashboard", "orders", "appointments", "chat", "notifications", "health",
    "prescriptions", "reminders", "profile", "medicines", "wishlist", "wallet", "reports",
    "programs", "returns", "support", "family", "community", "offers",
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

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/api/",
        ...locales.flatMap((locale) => [
          ...privateTreeFamilies.map((route) => `/${locale}/${route}`),
          ...privateLeafSuffixes.map((suffix) => `/${locale}${suffix}`),
        ]),
      ],
    },
    sitemap: `${siteOrigin()}/sitemap.xml`,
  };
}
