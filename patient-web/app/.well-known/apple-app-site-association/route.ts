import { NextResponse } from "next/server";
import { APP_LINK_LOCALES, PUBLIC_APP_LINK_PATHS, allAppLinkPatterns, appLinkPatterns } from "@/lib/app-links";

/** An Apple Team ID is 10 upper-case letters or digits. */
const TEAM_ID = /^[A-Z0-9]{10}$/;

export async function GET() {
  // Only the owner's real Team ID from the environment. With none (or a malformed one) the file is not served at all: an association
  // file naming a wrong app id would make iOS cache a failed verification and open every link in the browser.
  const teamId = (process.env.APPLE_TEAM_ID || "").trim();
  if (!TEAM_ID.test(teamId)) {
    return NextResponse.json({ error: "apple_app_site_association_not_configured" }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
  const bundleId = process.env.APPLE_BUNDLE_ID || "com.patient.nabd";
  const providerBundleId = process.env.APPLE_PROVIDER_BUNDLE_ID || "com.nabd.provider";

  const patterns = allAppLinkPatterns();
  const applinksDetail = {
    // Only public pages that the patient app maps to a real screen (lib/app-links.ts).
    paths: ["NOT /api/*", "NOT /.well-known/*", "NOT /admin/*", ...patterns],
    components: [
      { "/": "/api/*", exclude: true },
      { "/": "/.well-known/*", exclude: true },
      { "/": "/admin/*", exclude: true },
      ...PUBLIC_APP_LINK_PATHS.flatMap((entry) =>
        appLinkPatterns(entry).map((pattern, i) => (i === 0 ? { "/": pattern, comment: entry.comment } : { "/": pattern })),
      ),
    ],
  };

  const aasa = {
    applinks: {
      apps: [],
      details: [
        { appID: `${teamId}.${bundleId}`, ...applinksDetail },
        // The provider app takes only its own links: it does not open the patient pages, and two apps claiming one URL is ambiguous.
        {
          appID: `${teamId}.${providerBundleId}`,
          paths: ["NOT /api/*", "NOT /.well-known/*", "NOT /admin/*", "/provider/*", ...APP_LINK_LOCALES.map((l) => `/${l}/provider/*`)],
          components: [
            { "/": "/api/*", exclude: true },
            { "/": "/.well-known/*", exclude: true },
            { "/": "/admin/*", exclude: true },
            { "/": "/provider/*", comment: "Provider app deep links" },
            ...APP_LINK_LOCALES.map((l) => ({ "/": `/${l}/provider/*` })),
          ],
        },
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
