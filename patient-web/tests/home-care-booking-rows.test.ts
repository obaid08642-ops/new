import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

// A booking row in "my bookings" opens its visit (tracking and status), as the app's row does.
describe("home care: my bookings rows", () => {
  it("links each booking row to its visit page", () => {
    const source = readFileSync(resolve(process.cwd(), "app/[locale]/home-care/page.tsx"), "utf8");
    expect(source).toContain("href={`/${locale}/nursing/visits/${encodeURIComponent(booking.id)}`}");
  });

  it("the visit page exists at that route", () => {
    expect(readFileSync(resolve(process.cwd(), "app/[locale]/nursing/visits/[visitId]/page.tsx"), "utf8").length).toBeGreaterThan(0);
  });
});
