import { describe, expect, it } from "vitest";
import { contentSecurityPolicy, CSP_NONCE_PLACEHOLDER } from "../lib/security/csp";

// issue 777: the map page embeds an OpenStreetMap view; the policy must allow exactly that origin, not frames in general.
describe("the policy and OpenStreetMap", () => {
  const directives = Object.fromEntries(contentSecurityPolicy(CSP_NONCE_PLACEHOLDER, false).split("; ").map((part) => [part.split(" ")[0], part.split(" ").slice(1)]));

  it("lets the page frame openstreetmap.org and, for Google sign-in (issue 430), only Google's gsi path (Apple, X and Snapchat use popup windows)", () => {
    expect(directives["frame-src"]).toEqual(["'self'", "https://www.openstreetmap.org", "https://accounts.google.com/gsi/"]);
    expect(directives["connect-src"]).toEqual(expect.arrayContaining(["https://accounts.google.com/gsi/", "https://appleid.apple.com"]));
  });

  it("loads the tiles: https images are allowed", () => {
    expect(directives["img-src"]).toContain("https:");
  });

  it("lets the address map (MapLibre GL) load its style and tiles from OpenFreeMap only, and start its tile worker from a blob", () => {
    expect(directives["connect-src"]).toContain("https://tiles.openfreemap.org");
    expect(directives["connect-src"]).not.toContain("https:");
    expect(directives["worker-src"]).toEqual(["'self'", "blob:"]);
    expect(directives["script-src"].join(" ")).not.toContain("openfreemap");
    expect(directives["script-src"]).not.toContain("blob:");
  });

  it("does not loosen scripts, the default or who may frame this site", () => {
    expect(directives["default-src"]).toEqual(["'self'"]);
    expect(directives["frame-ancestors"]).toEqual(["'none'"]);
    expect(directives["script-src"].join(" ")).not.toContain("openstreetmap");
  });
});
