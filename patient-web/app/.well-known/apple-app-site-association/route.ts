import { NextResponse } from "next/server";

export async function GET() {
  const teamId = process.env.APPLE_TEAM_ID || "6AT2W85DBC";
  const bundleId = process.env.APPLE_BUNDLE_ID || "com.patient.nabd";
  const providerBundleId = process.env.APPLE_PROVIDER_BUNDLE_ID || "com.nabd.provider";

  const entityPaths = [
    "/p/*", "/medicine/*", "/doctor/*", "/condition/*", "/facility/*",
    "/doctors/*", "/home-nursing/*", "/s/*", "/pharmacy/*", "/pharmacies/*",
    "/consultations/*", "/labs/*", "/radiology/*", "/nursing/*", "/c/*",
    "/articles/*", "/services/*",
  ];
  const comments: Record<string, string> = {
    "/p/*": "Medicine detail screen",
    "/medicine/*": "Medicine detail screen alias",
    "/doctor/*": "Doctor profile screen",
    "/condition/*": "Condition health guide screen",
    "/facility/*": "Facility detail screen",
    "/doctors/*": "Doctors programmatic search screen",
    "/home-nursing/*": "Home nursing screen",
    "/s/*": "Public SEO link catcher",
    "/pharmacy/*": "Pharmacy screens",
    "/pharmacies/*": "Pharmacies by city",
    "/consultations/*": "Consultation flows",
    "/labs/*": "Lab tests by city",
    "/radiology/*": "Radiology services by city",
    "/nursing/*": "Nursing services",
    "/c/*": "Catalog categories",
    "/articles/*": "Health articles",
    "/services/*": "Service pages",
  };
  const locales = ["ar", "en", "ur", "hi", "bn", "fil"];
  const localized = locales.flatMap((l) => entityPaths.map((p) => `/${l}${p}`));
  const applinksDetail = {
    // Only paths with BOTH a web route AND an app screen are listed.
    paths: ["NOT /api/*", "NOT /.well-known/*", "NOT /admin/*", ...entityPaths, ...localized],
    components: [
      ...entityPaths.flatMap((p) => [
        { "/": p, comment: comments[p] },
        ...locales.map((l) => ({ "/": `/${l}${p}` })),
      ]),
      { "/": "/api/*", exclude: true },
      { "/": "/.well-known/*", exclude: true },
      { "/": "/admin/*", exclude: true },
    ],
  };

  const aasa = {
    applinks: {
      apps: [],
      details: [
        { appID: `${teamId}.${bundleId}`, ...applinksDetail },
        { appID: `${teamId}.${providerBundleId}`, ...applinksDetail },
      ],
    },
    webcredentials: {
      apps: [`${teamId}.${bundleId}`, `${teamId}.${providerBundleId}`],
    },
  };

  return NextResponse.json(aasa, {
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
    },
  });
}
