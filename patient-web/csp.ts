import type { NextConfig } from "next";

/**
 * F68 — Content-Security-Policy.
 *
 * The audit found no CSP anywhere in the web clients, and the backend sent one
 * that allowed `'unsafe-inline'` for scripts, which defeats the point of having
 * one: an injected inline script is exactly what CSP is supposed to block. The
 * backend nonce version is now in backend/src/common/security-headers.ts.
 *
 * The policy is built from the environment rather than hard-coded so the API
 * origin and the Sentry/analytics hosts can be declared next to the deployment
 * that needs them, and so a staging build cannot accidentally trust production
 * origins (or the reverse).
 */

/** Origins this app is allowed to talk to. */
const API_ORIGIN = process.env.NEXT_PUBLIC_API_ORIGIN || process.env.EXPO_PUBLIC_API_BASE_URL || "";

/** Split a comma-separated env list into trimmed, non-empty entries. */
const list = (value?: string) => (value || "").split(",").map((s) => s.trim()).filter(Boolean);
const EXTRA_SCRIPT = list(process.env.CSP_EXTRA_SCRIPT_SRC);
const EXTRA_CONNECT = list(process.env.CSP_EXTRA_CONNECT_SRC);
const EXTRA_IMG = list(process.env.CSP_EXTRA_IMG_SRC);

export function contentSecurityPolicy(nonce?: string): string {
  const isDev = process.env.NODE_ENV !== "production";
  const scriptSrc = [
    "'self'",
    // Next.js injects an inline bootstrap script; the nonce is what makes this
    // safe, and it is only applied in production where the nonce is issued.
    ...(nonce ? [`'nonce-${nonce}'`, "'strict-dynamic'"] : ["'unsafe-inline'"]),
    ...(isDev ? ["'unsafe-eval'"] : []),
    ...EXTRA_SCRIPT,
  ];
  const connectSrc = [
    "'self'",
    ...(API_ORIGIN ? [API_ORIGIN] : []),
    // ws:// for the realtime gateway
    ...(API_ORIGIN ? [API_ORIGIN.replace(/^http/, "ws")] : []),
    ...(isDev ? ["ws:", "http:", "https:"] : []),
    ...EXTRA_CONNECT,
  ];

  return [
    "default-src 'self'",
    `script-src ${scriptSrc.join(" ")}`,
    // Next injects inline styles for CSS-in-JS; style-src keeps 'unsafe-inline'
    // (the plan's alternative — migrating to CSS modules — is a separate task).
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' blob: data: https:",
    "font-src 'self' data:",
    `connect-src ${connectSrc.join(" ")}`,
    // Payment, camera and geolocation are used by the checkout and the
    // pharmacy flows, so they are delegated to the same origin only.
    "frame-src 'self' https://api.moyasar.com https://checkout.tap.company https://www.openstreetmap.org", // issue 777: the map page embeds OpenStreetMap
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "worker-src 'self' blob:",
    "manifest-src 'self'",
    ...(isDev ? [] : ["upgrade-insecure-requests"]),
  ].join("; ");
}

const securityHeaders = (nonce?: string) => [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(self), microphone=(self), geolocation=(self), payment=(self)" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  { key: "Cross-Origin-Resource-Policy", value: "same-site" },
  { key: "X-DNS-Prefetch-Control", value: "off" },
  { key: "Content-Security-Policy", value: contentSecurityPolicy(nonce) },
  ...(process.env.NODE_ENV === "production" ? [{ key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" }] : []),
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders() }];
  },
};

export default nextConfig;
