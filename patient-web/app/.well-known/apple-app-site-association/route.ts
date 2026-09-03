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
          paths: [
            "NOT /api/*",
            "NOT /.well-known/*",
            "NOT /admin/*",
            "/p/*",
            "/medicine/*",
            "/doctor/*",
            "/condition/*",
            "/facility/*",
            "/hospital/*",
            "/clinic/*",
            "/doctors/*",
            "/home-nursing/*",
            "/s/*",
            "/pharmacy/*",
            "/consultations/*",
          ],
          components: [
            { "/": "/p/*", comment: "Medicine detail screen" },
            { "/": "/medicine/*", comment: "Medicine detail screen alias" },
            { "/": "/doctor/*", comment: "Doctor profile screen" },
            { "/": "/condition/*", comment: "Condition health guide screen" },
            { "/": "/facility/*", comment: "Facility detail screen" },
            { "/": "/hospital/*", comment: "Hospital screen" },
            { "/": "/clinic/*", comment: "Clinic screen" },
            { "/": "/doctors/*", comment: "Doctors programmatic search screen" },
            { "/": "/home-nursing/*", comment: "Home nursing screen" },
            { "/": "/s/*", comment: "Public SEO link catcher" },
            { "/": "/api/*", exclude: true },
            { "/": "/.well-known/*", exclude: true },
            { "/": "/admin/*", exclude: true },
          ],
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
