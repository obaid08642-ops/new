import { beforeEach, describe, expect, it, vi } from "vitest";

const captured: Array<{ level?: string; fingerprint?: string[] }> = [];
const captureRequestError = vi.fn();
vi.mock("@sentry/nextjs", () => ({
  captureRequestError: (...a: unknown[]) => captureRequestError(...a),
  withScope: (cb: (s: unknown) => void) => {
    const state: { level?: string; fingerprint?: string[] } = {};
    captured.push(state);
    cb({ setLevel: (l: string) => (state.level = l), setFingerprint: (f: string[]) => (state.fingerprint = f), setTag: () => undefined });
  },
}));

import { PublicDataUnavailableError } from "../api/public-unavailable";
import { onRequestError, publicUnavailableWhat } from "./request-error";

const req = (path: string) => ({ path, method: "GET", headers: {} }) as never;
const ctx = { routerKind: "App Router", routePath: "/[locale]/p/[slug]", routeType: "render" } as never;

describe("onRequestError", () => {
  beforeEach(() => { captured.length = 0; captureRequestError.mockClear(); });

  it("reports the outage once per request, as a warning with a stable fingerprint per `what`", () => {
    onRequestError(new PublicDataUnavailableError("product"), req("/ar/p/a"), ctx);
    onRequestError(new PublicDataUnavailableError("product"), req("/ar/p/a"), ctx); // generateMetadata + page, same request
    expect(captureRequestError).toHaveBeenCalledTimes(1);
    expect(captured[0]).toEqual({ level: "warning", fingerprint: ["public-data-unavailable", "product"] });
  });

  it("uses the same fingerprint for different pages of the same kind, and a different one per kind", () => {
    onRequestError(new PublicDataUnavailableError("product"), req("/en/p/x"), ctx);
    onRequestError(new PublicDataUnavailableError("category"), req("/en/c/y"), ctx);
    expect(captured.map((c) => c.fingerprint)).toEqual([["public-data-unavailable", "product"], ["public-data-unavailable", "category"]]);
  });

  it("recognises the error by message when the class did not survive serialisation", () => {
    expect(publicUnavailableWhat(new Error("public data unavailable: home"))).toBe("home");
  });

  it("passes every other error through unchanged", () => {
    onRequestError(new Error("boom"), req("/ar/x"), ctx);
    expect(captureRequestError).toHaveBeenCalledTimes(1);
    expect(captured).toHaveLength(0);
  });
});
