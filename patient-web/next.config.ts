import path from "node:path";
import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";
import { withSentryConfig } from "@sentry/nextjs";
import { contentSecurityPolicy } from "./csp";
import { localeOnlyRedirects } from "./lib/routing/locale-redirects";
import { IMAGE_HOSTS } from "./lib/image-hosts";
import { queryTwinRewrites, unavailablePageRewrite } from "./lib/security/query-twin";

const nextConfig: NextConfig = {
  output: "standalone",
  poweredByHeader: false,
  images: {
    // The same hosts lib/image-hosts.ts lets the page render; any other host would make next/image throw.
    remotePatterns: IMAGE_HOSTS.map((hostname) => ({ protocol: "https" as const, hostname, pathname: "/**" })),
    formats: ["image/avif", "image/webp"],
  },
  outputFileTracingIncludes: {
    "/*": ["./node_modules/@swc/helpers/**/*"],
  },
  // P14.10: more than one web instance shares the ISR/data cache in Redis (cache-handler.cjs). Opt-in at build time
  // (NEXT_CACHE_HANDLER=redis); then no instance keeps its own in-memory copy. One instance keeps Next's file cache.
  ...(process.env.NEXT_CACHE_HANDLER === "redis"
    ? { cacheHandler: path.join(process.cwd(), "cache-handler.cjs"), cacheMaxMemorySize: 0 }
    : {}),
  experimental: {
    globalNotFound: true,
    // F82 (issue 427): the default merged the CSS modules of most sections (product, diagnostics, prescriptions, orders,
    // health, ...) into one 112 KB render-blocking stylesheet that every page loaded. The graph strategy groups CSS by
    // the routes that import it, so a page downloads close to only its own CSS (Turbopack only).
    cssChunking: "graph",
  },

  allowedDevOrigins: ["127.0.0.1", "3000-ikwbywe2u081i4meqv02p-09e989e4.sg1.manus.computer"],
  async redirects() {
    return localeOnlyRedirects([
      { source: "/:locale/doctors", destination: "/:locale/consultations/doctors", permanent: false },
      { source: "/:locale/doctor", destination: "/:locale/consultations/doctors", permanent: false },
      { source: "/:locale/labs", destination: "/:locale/diagnostics/labs", permanent: false },
      { source: "/:locale/radiology", destination: "/:locale/diagnostics/radiology", permanent: false },
      { source: "/:locale/nursing", destination: "/:locale/nursing/catalog", permanent: false },
      { source: "/:locale/nursing/booking", destination: "/:locale/nursing/catalog", permanent: false },
      { source: "/:locale/home-nursing", destination: "/:locale/nursing/catalog", permanent: false },
      { source: "/:locale/medicine", destination: "/:locale/c", permanent: true },
      { source: "/:locale/pharmacies", destination: "/:locale/c", permanent: false },
      // F82: the pharmacy hub is the catalogue. app/[locale]/pharmacy/page.tsx only redirects, and a redirect from a static
      // page is sent as a 200 with the whole app shell and a one-second <meta refresh> (Lighthouse audited the second page
      // after the first had loaded its scripts). A config redirect is a plain 307 before any rendering.
      { source: "/:locale/pharmacy", destination: "/:locale/c", permanent: false },
      { source: "/:locale/services", destination: "/:locale", permanent: false },
      // owner decision 32 (issue 436): the web has no onboarding; old links open the home page
      { source: "/:locale/onboarding/:path*", destination: "/:locale", permanent: false },
      { source: "/:locale/p", destination: "/:locale/c", permanent: false },
      { source: "/:locale/s", destination: "/:locale/search", permanent: false },
      { source: "/:locale/payments", destination: "/:locale/cart/checkout", permanent: false },
      // Batch 5 (merge map, section 1): the old health screens are tabs and sections of the new ones. The source query is forwarded,
      // so a stale link keeps its `type` filter and an edit link its `edit` id; the screens read no health data from the URL.
      { source: "/:locale/health/score", destination: "/:locale/health", permanent: false },
      { source: "/:locale/health/vitals/log", destination: "/:locale/health/vitals?tab=today&add=1", permanent: false },
      { source: "/:locale/health/trends", destination: "/:locale/health/vitals?tab=trends", permanent: false },
      { source: "/:locale/health/refills", destination: "/:locale/health/medications?tab=refills", permanent: false },
      { source: "/:locale/health/chronic-medications", destination: "/:locale/health/medications?tab=chronic", permanent: false },
      { source: "/:locale/reminders", destination: "/:locale/health/medications?tab=all", permanent: false },
      { source: "/:locale/reminders/add", destination: "/:locale/health/medications?tab=all&add=1", permanent: false },
      { source: "/:locale/health/conditions-allergies", destination: "/:locale/health/profile#conditions", permanent: false },
      { source: "/:locale/health/chronic-diseases", destination: "/:locale/health/profile#chronic", permanent: false },
      { source: "/:locale/health/emergency-contacts", destination: "/:locale/health/profile#emergency", permanent: false },
      { source: "/:locale/family/emergency-contacts", destination: "/:locale/health/profile#emergency", permanent: false },
      { source: "/:locale/health/reports", destination: "/:locale/health/records?tab=reports", permanent: false },
      { source: "/:locale/reports", destination: "/:locale/health/records?tab=reports", permanent: false },
      { source: "/:locale/health/timeline", destination: "/:locale/health/records?tab=timeline", permanent: false },
      { source: "/:locale/reports/timeline", destination: "/:locale/health/records?tab=timeline", permanent: false },
      // Batch 6 (merge map, section 2): the family screens. `/family` is the hub (members, group, Requests), the member screen holds the
      // member's records and permissions, and invite, join and scan are the tabs of `/family/add`. The source query is forwarded,
      // so a stale join link keeps its `code`.
      { source: "/:locale/family/permissions", destination: "/:locale/family", permanent: false },
      { source: "/:locale/family/permission-requests", destination: "/:locale/family#requests", permanent: false },
      { source: "/:locale/family/invite", destination: "/:locale/family/add?tab=invite", permanent: false },
      { source: "/:locale/family/join", destination: "/:locale/family/add?tab=join", permanent: false },
      { source: "/:locale/family/scan", destination: "/:locale/family/add?tab=scan", permanent: false },
      { source: "/:locale/health/add-family-member", destination: "/:locale/family/add?tab=invite", permanent: false },
    ]);
  },
  // F82-3: internal rewrites (the address does not change). They run after the proxy has classified and stamped the request by
  // its original path. See lib/security/query-twin.ts for why they are config rewrites and not rewrites made in proxy.ts.
  async rewrites() {
    return { beforeFiles: [...queryTwinRewrites(), unavailablePageRewrite()], afterFiles: [], fallback: [] };
  },
  async headers() {
    // On every response, build assets included.
    const everyResponse = [
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "Cross-Origin-Resource-Policy", value: "same-site" },
      ...(process.env.NODE_ENV === "production" ? [{ key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" }] : []),
    ];
    // F82: these govern a document (framing, its CSP, its referrer, the features it may use, its browsing context group) and
    // do nothing on a hashed script, stylesheet or font, where they only added about 1 KB of headers to each of the 15-20
    // requests of a page load (counted in its transfer budget). So they are sent on everything except /_next/static/.
    const documentOnly = [
      { key: "X-Frame-Options", value: "DENY" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      { key: "Permissions-Policy", value: "camera=(self), microphone=(self), geolocation=(self), payment=(self)" },
      // issue 430: Google sign-in's popup must be able to answer the page (Google Identity Services needs same-origin-allow-popups)
      { key: "Cross-Origin-Opener-Policy", value: "same-origin-allow-popups" },
      { key: "Cross-Origin-Resource-Policy", value: "same-site" },
      { key: "X-DNS-Prefetch-Control", value: "off" },
      // F68: the web clients had no CSP at all.
      { key: "Content-Security-Policy", value: contentSecurityPolicy() },
    ];
    return [
      { source: "/:path*", headers: everyResponse },
      { source: "/:path((?!_next/static/).*)", headers: documentOnly },
    ];
  }
};

// F82-1: the catalogues are compiled at build time, so the browser does not ship the ICU message
// parser (about 12 KB gz) and does not parse a message on first use.
const withNextIntl = createNextIntlPlugin({
  requestConfig: "./i18n/request.ts",
  experimental: { messages: { path: "./messages", format: "json", locales: "infer", precompile: true } },
});
// P20.4: the release (SENTRY_RELEASE = the git SHA, a build arg of Dockerfile.patient-web) is written into the server
// and browser bundles, so every event names the deployed commit. Source maps go to the patient-web project and are
// deleted from the image afterwards; without SENTRY_AUTH_TOKEN (local and CI builds) nothing is uploaded.
export default withSentryConfig(withNextIntl(nextConfig), {
  org: "nabdplus",
  project: "patient-web",
  sentryUrl: "https://de.sentry.io/",
  authToken: process.env.SENTRY_AUTH_TOKEN,
  release: { name: process.env.SENTRY_RELEASE || undefined, create: !!process.env.SENTRY_AUTH_TOKEN },
  sourcemaps: { disable: !process.env.SENTRY_AUTH_TOKEN, deleteSourcemapsAfterUpload: true },
  telemetry: false,
  silent: true,
  disableLogger: true,
});
