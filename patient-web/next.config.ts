import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const nextConfig: NextConfig = {
  output: "standalone",
  poweredByHeader: false,
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
      { source: "/:locale/services", destination: "/:locale/consultations", permanent: false },
      { source: "/:locale/p", destination: "/:locale/c", permanent: false },
      { source: "/:locale/s", destination: "/:locale/search", permanent: false },
      { source: "/:locale/payments", destination: "/:locale/cart/checkout", permanent: false },
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
      ...(process.env.NODE_ENV === "production" ? [{ key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" }] : []),
    ] }];
  }
};

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");
export default withNextIntl(nextConfig);
