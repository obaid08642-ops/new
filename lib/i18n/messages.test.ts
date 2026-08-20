import { describe, expect, it } from "vitest";
import { readFile } from "node:fs/promises";
import ar from "@/messages/ar.json";
import bn from "@/messages/bn.json";
import en from "@/messages/en.json";
import fil from "@/messages/fil.json";
import hi from "@/messages/hi.json";
import ur from "@/messages/ur.json";
import { getGlobalNotFoundCopy } from "./global-notfound";

describe("patient web messages", () => {
  it("keeps Arabic and English namespaces aligned for the web core", () => {
    expect(Object.keys(ar).sort()).toEqual(Object.keys(en).sort());
    for (const namespace of ["Shared", "Home", "Login", "Dashboard", "Metadata", "NotFound"] as const) {
      expect(Object.keys(ar[namespace]).sort()).toEqual(Object.keys(en[namespace]).sort());
    }
  });

  it("provides translated core namespaces for every supported mobile locale", () => {
    for (const messages of [ur, hi, bn, fil]) {
      for (const namespace of ["Shared", "Home", "Login", "Dashboard", "Metadata", "NotFound", "RouteState"] as const) {
        expect(Object.keys(messages[namespace]).sort()).toEqual(Object.keys(en[namespace]).sort());
      }
    }
  });

  it("does not leave raw loading labels or backend messages in the visible core", async () => {
    const [loading, loginForm] = await Promise.all([
      readFile(new URL("../../app/[locale]/dashboard/loading.tsx", import.meta.url), "utf8"),
      readFile(new URL("../../components-next/login-form.tsx", import.meta.url), "utf8")
    ]);
    expect(loading).not.toContain('aria-label="Loading"');
    expect(loginForm).not.toContain("setMessage(payload.message");
    expect(loginForm).toContain("onChange={(event) => setPassword(event.target.value)}");
  });

  it("uses a deliberate Arabic-safe default for global 404 and honors the English locale header", () => {
    expect(getGlobalNotFoundCopy("en")).toEqual({ locale: "en", copy: en.NotFound });
    expect(getGlobalNotFoundCopy("ar")).toEqual({ locale: "ar", copy: ar.NotFound });
    expect(getGlobalNotFoundCopy(null)).toEqual({ locale: "ar", copy: ar.NotFound });
  });
});
