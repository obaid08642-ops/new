import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";
import { withSentryConfig } from "@sentry/nextjs";
import { contentSecurityPolicy } from "./csp";
import { IMAGE_HOSTS } from "./lib/image-hosts";

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
  experimental: { globalNotFound: true },

  allowedDevOrigins: ["127.0.0.1", "3000-ikwbywe2u081i4meqv02p-09e989e4.sg1.manus.computer"],
  async redirects() {
    return [
      { source: "/:locale/doctors", destination: "/:locale/consultations/doctors", permanent: false },
      { source: "/:locale/doctor", destination: "/:locale/consultations/doctors", permanent: false },
      { source: "/:locale/labs", destination: "/:locale/diagnostics/labs", permanent: false },
      { source: "/:locale/radiology", destination: "/:locale/diagnostics/radiology", permanent: false },
      { source: "/:locale/nursing", destination: "/:locale/nursing/catalog", permanent: false },
      { source: "/:locale/nursing/booking", destination: "/:locale/nursing/catalog", permanent: false },
      { source: "/:locale/home-nursing", destination: "/:locale/nursing/catalog", permanent: false },
      { source: "/:locale/medicine", destination: "/:locale/medicines", permanent: false },
      { source: "/:locale/pharmacies", destination: "/:locale/c", permanent: false },
      { source: "/:locale/services", destination: "/:locale", permanent: false },
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
    ];
  },
  async headers() {
    return [{ source: "/:path*", headers: [
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "X-Frame-Options", value: "DENY" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      { key: "Permissions-Policy", value: "camera=(self), microphone=(self), geolocation=(self), payment=(self)" },
      { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
      { key: "Cross-Origin-Resource-Policy", value: "same-site" },
      { key: "X-DNS-Prefetch-Control", value: "off" },
      // F68: the web clients had no CSP at all.
      { key: "Content-Security-Policy", value: contentSecurityPolicy() },
      ...(process.env.NODE_ENV === "production" ? [{ key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" }] : []),
    ] }];
  }
};

// F82-1: the catalogues are compiled at build time, so the browser does not ship the ICU message
// parser (about 12 KB gz) and does not parse a message on first use.
const withNextIntl = createNextIntlPlugin({
  requestConfig: "./i18n/request.ts",
  experimental: { messages: { path: "./messages", format: "json", locales: "infer", precompile: true } },
});
export default withSentryConfig(withNextIntl(nextConfig), {
  silent: true,
  disableLogger: true,
});
