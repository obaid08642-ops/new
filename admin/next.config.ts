import type { NextConfig } from "next";

/**
 * F68 — Content-Security-Policy for the admin dashboard.
 *
 * The admin app is the highest-value target on the platform: a single injected
 * script there reads every patient, provider and finance record. It had no CSP
 * and no other security headers at all (no nosniff, no frame-ancestors), so
 * this adds the full set rather than only the policy.
 *
 * The admin talks to the BFF on its own origin, so the policy stays on 'self'
 * unless the owner declares extra hosts — no wildcard trust.
 */
// The policy itself is set per request by src/proxy.ts (F68: fresh nonce, no-store); the static headers below
// are the rest of the set.
const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // Owner decision 2026-10-10 (#981-#993): the public directory pages live in patient-web, not here. `/` goes to the
  // console; src/proxy.ts sends a visitor without a session on to /login.
  async redirects() {
    return [
      { source: "/", destination: "/admin/dashboard", permanent: false },
      // Owner decision 2026-10-10 (#949): one medicines editor. The old governance page is gone.
      // Owner decision 2026-10-10 (D-1): community moderation is gone; the admin reviews doctor articles instead.
      { source: "/admin/community-moderation", destination: "/admin/article-review", permanent: true },
      { source: "/admin/catalog-governance", destination: "/admin/medicines-catalog", permanent: true },
    ];
  },
  async headers() {
    return [{ source: "/:path*", headers: [
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "X-Frame-Options", value: "DENY" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
      { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
      { key: "Content-Security-Policy", value: "frame-ancestors 'none'; object-src 'none'; base-uri 'self'" },
      ...(process.env.NODE_ENV === "production" ? [{ key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" }] : []),
    ] }, {
      // Barcode scan on the medicine catalogue is the only screen that opens the camera (same origin only).
      // Listed after the global entry, so this Permissions-Policy replaces it for this one path.
      source: "/admin/medicines-catalog",
      headers: [{ key: "Permissions-Policy", value: "camera=(self), microphone=(), geolocation=()" }],
    }];
  },
};

export default nextConfig;
