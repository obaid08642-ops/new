import { afterEach, describe, expect, it, vi } from "vitest";
import { contentSecurityPolicy, CSP_NONCE_PLACEHOLDER, sentryIngestOrigin } from "../lib/security/csp";

// P20.4: browser errors reach the patient-web Sentry project; the policy allows exactly the DSN's ingest origin.
const DSN = "https://b85367ac6782629e65b311de92c0e3bc@o4511819998429184.ingest.de.sentry.io/4512078080245840";
const connectSrc = () => contentSecurityPolicy(CSP_NONCE_PLACEHOLDER, false).split("; ").find((d) => d.startsWith("connect-src "))!.split(" ").slice(1);

describe("Sentry in the content security policy", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("takes the ingest origin (no key, no path) from the DSN", () => {
    expect(sentryIngestOrigin(DSN)).toBe("https://o4511819998429184.ingest.de.sentry.io");
    expect(sentryIngestOrigin("")).toBeNull();
    expect(sentryIngestOrigin("not a url")).toBeNull();
  });

  it("allows the ingest origin when the build has a DSN, and adds nothing without one", () => {
    vi.stubEnv("NEXT_PUBLIC_SENTRY_DSN", DSN);
    expect(connectSrc()).toContain("https://o4511819998429184.ingest.de.sentry.io");
    expect(connectSrc().join(" ")).not.toContain("b85367ac");
    vi.stubEnv("NEXT_PUBLIC_SENTRY_DSN", "");
    expect(connectSrc().join(" ")).not.toContain("sentry");
    expect(connectSrc()).not.toContain("");
  });
});
