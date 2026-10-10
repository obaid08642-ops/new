import { describe, expect, it } from "vitest";
import { contentSecurityPolicy, CSP_NONCE_PLACEHOLDER } from "../lib/security/csp";

// issue 777: the map page embeds an OpenStreetMap view; the policy must allow exactly that origin, not frames in general.
describe("the policy and OpenStreetMap", () => {
  const directives = Object.fromEntries(contentSecurityPolicy(CSP_NONCE_PLACEHOLDER, false).split("; ").map((part) => [part.split(" ")[0], part.split(" ").slice(1)]));

  it("lets the page frame openstreetmap.org and nothing else but itself", () => {
    expect(directives["frame-src"]).toEqual(["'self'", "https://www.openstreetmap.org"]);
  });

  it("loads the tiles: https images are allowed", () => {
    expect(directives["img-src"]).toContain("https:");
  });

  it("does not loosen scripts, the default or who may frame this site", () => {
    expect(directives["default-src"]).toEqual(["'self'"]);
    expect(directives["frame-ancestors"]).toEqual(["'none'"]);
    expect(directives["script-src"].join(" ")).not.toContain("openstreetmap");
  });
});
