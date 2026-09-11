import { NextResponse } from "next/server";

export async function GET() {
  const teamId = process.env.APPLE_TEAM_ID || "APPLE_TEAM_ID_PENDING";
  const bundleId = process.env.APPLE_BUNDLE_ID || "com.patient.nabd";
  const appId = `${teamId}.${bundleId}`;

  const aasa = {
    applinks: {
      apps: [],
      details: [
        {
          appID: appId,
          // Only paths with BOTH a web route AND an app screen are listed.
          // /hospital/* and /clinic/* were removed: no such web routes exist
          // (hospitals/clinics resolve via /facility/*).
          // Web URLs are locale-prefixed (/ar/p/...) while legacy bare URLs
          // (/p/...) also circulate — both variants must open the app.
          ...(() => {
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
            return {
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
          })(),
        },
      ],
    },
    webcredentials: {
      apps: [appId],
    },
  };

  return NextResponse.json(aasa, {
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
    },
  });
}
