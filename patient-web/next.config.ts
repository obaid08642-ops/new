import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";
import { withSentryConfig } from "@sentry/nextjs";
import { contentSecurityPolicy } from "./csp";
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
    ];
  },
  // F82-3: internal rewrites (the address does not change). They run after the proxy has classified and stamped the request by
  // its original path. See lib/security/query-twin.ts for why they are config rewrites and not rewrites made in proxy.ts.
  async rewrites() {
    return { beforeFiles: [...queryTwinRewrites(), unavailablePageRewrite()], afterFiles: [], fallback: [] };
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
