import type { MetadataRoute } from "next";
import { siteOrigin } from "@/lib/seo";

export default function robots(): MetadataRoute.Robots {
  const privatePaths = [
    "/api/",
    "/ar/login",
    "/en/login",
    "/ar/dashboard",
    "/en/dashboard",
    "/ar/orders",
    "/en/orders",
    "/ar/appointments",
    "/en/appointments",
    "/ar/diagnostics",
    "/en/diagnostics",
    "/ar/home-care",
    "/en/home-care",
    "/ar/family",
    "/en/family",
    "/ar/chat",
    "/en/chat",
    "/ar/notifications",
    "/en/notifications",
    "/ar/health",
    "/en/health",
    "/ar/prescriptions",
    "/en/prescriptions",
    "/ar/reminders",
    "/en/reminders",
    "/ar/profile",
    "/en/profile",
  ];

  return { rules: { userAgent: "*", allow: "/", disallow: privatePaths }, sitemap: `${siteOrigin()}/sitemap.xml` };
}
