import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { isShareToken } from "@/lib/api/billing-server";
import { isAllowedPatientApiRequest } from "@/lib/api/patient-allowlist";

const ID = "3f2b8c1e-4d5a-4b6c-8d7e-9f0a1b2c3d4e";
const LINK = "0a1b2c3d-4e5f-4a6b-8c7d-9e0f1a2b3c4d";

describe("the share token", () => {
  it("accepts a 43-character base64url token and nothing that could reach another path", () => {
    expect(isShareToken("Zm9vYmFyYmF6cXV4MTIzNDU2Nzg5MC1fYWJjZGU")).toBe(true);
    for (const bad of ["", "short", "../etc/passwd", "a/b/cccccccccccccccccccccc", "tok en tok en tok en tok en", "x".repeat(101)]) expect(isShareToken(bad), bad).toBe(false);
  });
});

describe("the receipt's share-link routes through /api/patient", () => {
  it("allows listing, creating and revoking for the receipt kinds, with the right methods only", () => {
    expect(isAllowedPatientApiRequest(`/billing/invoice/lab/${ID}/share-links`, "GET")).toBe(true);
    expect(isAllowedPatientApiRequest(`/billing/invoice/lab/${ID}/share-link`, "POST")).toBe(true);
    expect(isAllowedPatientApiRequest(`/billing/invoice/lab/${ID}/share-links/${LINK}`, "DELETE")).toBe(true);
    expect(isAllowedPatientApiRequest(`/billing/invoice/lab/${ID}/share-link`, "GET")).toBe(false);
    expect(isAllowedPatientApiRequest(`/billing/invoice/lab/${ID}/share-links`, "POST")).toBe(false);
    expect(isAllowedPatientApiRequest(`/billing/invoice/lab/${ID}/share-links/${LINK}`, "POST")).toBe(false);
    expect(isAllowedPatientApiRequest(`/billing/invoice/unknown/${ID}/share-link`, "POST")).toBe(false);
  });
  it("does not open the public view through the signed-in proxy", () => {
    expect(isAllowedPatientApiRequest("/billing/shared/abcdefghijklmnopqrstuvwxyz", "GET")).toBe(false);
  });
});

describe("the public shared page", () => {
  const page = readFileSync("app/[locale]/receipt/shared/[token]/page.tsx", "utf8");
  const pdf = readFileSync("app/api/receipt-shared/[token]/pdf/route.ts", "utf8");
  it("is never cached or indexed, sends no referrer, and needs no sign-in", () => {
    expect(page).toContain('export const dynamic = "force-dynamic"');
    expect(page).toMatch(/robots: \{ index: false, follow: false/);
    expect(page).toContain('referrer: "no-referrer"');
    expect(page).not.toContain("requirePatientAccess");
  });
  it("answers one 'not available' page for an unknown, expired or revoked link", () => {
    expect(page).toMatch(/response\.status === 404/);
    expect(page).toContain("isShareToken(token)");
  });
  it("serves the PDF with no-store, noindex and no referrer", () => {
    expect(pdf).toContain("private, no-store");
    expect(pdf).toContain("noindex");
    expect(pdf).toContain("no-referrer");
    expect(pdf).toContain("isShareToken(token)");
  });
});
