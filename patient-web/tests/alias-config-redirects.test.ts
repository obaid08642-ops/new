import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import nextConfig from "../next.config";

type Row = { source: string; destination: string; permanent: boolean };
const rows = async () => (await nextConfig.redirects!()) as Row[];
const strip = (source: string) => source.replace(/^\/:locale\([^)]*\)/, "");

/** The old addresses that only redirect are config redirects (a plain 307 before rendering), not pages that answer 200 and redirect afterwards. */
describe("alias addresses are config redirects", () => {
  it.each([
    ["/ai/symptom-checker", "/:locale/ai?mode=symptoms"],
    ["/ai/triage", "/:locale/ai?mode=symptoms"],
    ["/pharmacy/request", "/:locale/pharmacy/rx-order?via=type"],
    ["/pharmacy/scan-prescription", "/:locale/pharmacy/rx-order?via=photo"],
    ["/pharmacy/manual-order", "/:locale/pharmacy/rx-order?via=type"],
    ["/pharmacy/interactions", "/:locale/pharmacy/barcode"],
    ["/pharmacy/waiting-for-pharmacy", "/:locale/pharmacy/broadcast-status"],
    ["/diagnostics/technician-tracking", "/:locale/diagnostics/sample-tracking"],
    ["/insurance/policy-detail", "/:locale/insurance?tab=policy"],
    ["/insurance/claims", "/:locale/insurance"],
    ["/loyalty/rewards", "/:locale/loyalty?tab=rewards"],
    ["/nutrition/plan", "/:locale/nutrition?tab=plan"],
    ["/maternity/tracker", "/:locale/maternity?tab=pregnancy"],
    ["/chat", "/:locale/appointments"],
    ["/mental-health/therapist-match", "/:locale/consultations/doctors?specialty=psychiatry"],
    ["/ai/chat-doctor", "/:locale/appointments"],
    ["/prescriptions", "/:locale/health/records?tab=prescriptions"],
    ["/settings/data", "/:locale/settings/privacy?tab=data"],
  ])("%s -> %s", async (source, destination) => {
    const row = (await rows()).find((r) => strip(r.source) === source);
    expect(row, source).toBeDefined();
    expect(row!.destination).toBe(destination);
    expect(row!.permanent).toBe(false);
  });

  it("only matches a real locale, so an API path is never caught", async () => {
    const row = (await rows()).find((r) => strip(r.source) === "/chat")!;
    expect(row.source).toMatch(/^\/:locale\(ar\|/);
  });

  // Older rows that were never converted (their pages carry tests of their own: permanent SEO redirects, a query-aware search redirect).
  const OLDER = ["/labs", "/medicine", "/s"];

  it("no alias address keeps a page of its own (a page behind a config redirect is dead code)", async () => {
    const dead = (await rows())
      .map((r) => strip(r.source))
      .filter((path) => !OLDER.includes(path))
      .filter((path) => !path.includes(":") && !path.includes("(") && existsSync(join(__dirname, "../app/[locale]", path, "page.tsx")));
    expect(dead).toEqual([]);
  });
});
