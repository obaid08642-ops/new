import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";
import { proxy } from "./proxy";

function request(pathname: string) {
  return new NextRequest(new URL(pathname, "https://nabd.plus"));
}

describe("indexing response policy", () => {
  it("keeps the six public locale entry points free of an HTTP noindex header", () => {
    for (const locale of ["ar", "en", "ur", "hi", "bn", "fil"]) {
      expect(proxy(request(`/${locale}`)).headers.get("x-robots-tag")).toBeNull();
    }
  });

  it("adds a noindex header to private portal routes and the root redirect", () => {
    for (const pathname of ["/", "/en/login", "/ar/dashboard", "/ur/orders", "/hi/health", "/bn/reminders", "/fil/medicine-catalog"]) {
      expect(proxy(request(pathname)).headers.get("x-robots-tag")).toBe("noindex, nofollow, noarchive");
    }
  });
});
