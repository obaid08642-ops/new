import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs/config";
import { resolveRelease } from "./src/lib/observability/error-reporter";

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
const list = (value?: string) => (value || "").split(",").map((s) => s.trim()).filter(Boolean);

const API_ORIGIN = process.env.NEXT_PUBLIC_API_ORIGIN || process.env.ADMIN_BACKEND_URL || "";

const isDev = process.env.NODE_ENV !== "production";

const csp = [
  "default-src 'self'",
  // Next's inline bootstrap script has no nonce here (the admin does not use a
  // nonce middleware), so the inline allowance stays; moving the app to
  // CSS-modules-only styling is what removes it, tracked separately.
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' blob: data: https:",
  "font-src 'self' data:",
  `connect-src 'self'${list(API_ORIGIN).map((o) => ` ${o}`).join("")}${isDev ? " http: https: ws:" : ""}`,
  "frame-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "worker-src 'self' blob:",
  "manifest-src 'self'",
  ...(isDev ? [] : ["upgrade-insecure-requests"]),
].join("; ");

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: [
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "X-Frame-Options", value: "DENY" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
      { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
      { key: "Content-Security-Policy", value: csp },
      ...(process.env.NODE_ENV === "production" ? [{ key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" }] : []),
    ] }];
  },
};

// 15.5: the release every crash report is filed against. `withSentryConfig`
// uploads the matching source maps at build time, which is what turns a minified
// production stack trace back into readable source.
const release = resolveRelease({ ...process.env, SENTRY_RELEASE: process.env.SENTRY_RELEASE });

const withSentry = withSentryConfig(nextConfig, {
  release: { name: release },
  // The admin CSP is defined above; Sentry must not loosen it.
  silent: true,
  sourcemaps: { disable: false },
  // No Replay integration is added on purpose: an admin session replays patient
  // and finance records, so session replay must never be switched on here.
  errorHandler: (error) => error,
});

export default withSentry;
