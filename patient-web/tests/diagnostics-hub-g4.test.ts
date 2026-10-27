// Owner review G4: labs and radiology hub = one "My orders and results" button, no results/compare buttons in the place section,
// the full tests and scans (paged), a large card per item with "Add to cart" and "Order now".
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { HUB_PAGE_SIZE, pageRows, parseHubPages } from "@/lib/diagnostics-hub";

const code = (file: string) => readFileSync(file, "utf8");
const hub = code("app/[locale]/diagnostics/page.tsx");

describe("hub paging (pure)", () => {
  const rows = Array.from({ length: 45 }, (_, i) => i);
  it("opens one page first, then one more per step, until every row is shown", () => {
    expect(pageRows(rows, 1).shown).toHaveLength(HUB_PAGE_SIZE);
    expect(pageRows(rows, 1).hasMore).toBe(true);
    expect(pageRows(rows, 2).shown).toHaveLength(HUB_PAGE_SIZE * 2);
    const last = pageRows(rows, 3);
    expect(last.shown).toEqual(rows);
    expect(last.hasMore).toBe(false);
    expect(last.remaining).toBe(0);
  });
  it("never drops rows and tolerates a short list or a bad page", () => {
    expect(pageRows([1, 2], 1)).toEqual({ shown: [1, 2], hasMore: false, remaining: 0 });
    expect(pageRows(rows, 0).shown).toHaveLength(HUB_PAGE_SIZE);
  });
  it("reads ?more= safely", () => {
    expect(parseHubPages(undefined)).toBe(1);
    expect(parseHubPages("abc")).toBe(1);
    expect(parseHubPages("-3")).toBe(1);
    expect(parseHubPages("3")).toBe(3);
    expect(parseHubPages("999999")).toBe(500);
  });
});

describe("hub layout", () => {
  it("has a single orders-and-results entry (the shell button) and no separate results / compare / requests buttons", () => {
    expect(hub).toContain("resultsHref={`/${locale}/diagnostics/bookings`}");
    expect(hub).not.toContain("QuickLink");
    expect(hub).not.toContain("quickResults");
    expect(hub).not.toContain("quickCompare");
    expect(hub).not.toContain('t("myRequests")');
  });
  it("lists every test and scan (no fixed LIMIT slice) with a Show more step", () => {
    expect(hub).not.toMatch(/LIMIT_(TESTS|RADIOLOGY)/);
    expect(hub).toContain("pageRows(allTests, pages)");
    expect(hub).toContain("pageRows(allScans, pages)");
    expect(hub).toContain('t("showMore")');
  });
  it("gives each item a card with both actions, keyed to its own service basket", () => {
    expect(hub).toContain('<ItemActions kind="lab"');
    expect(hub).toContain('<ItemActions kind="radiology"');
    const actions = code("components-next/ordering/add-to-basket.tsx");
    expect(actions).toContain('t("ctaOne")');
    expect(actions).toContain('t("orderNow")');
    const detail = code("app/[locale]/labs/[testSlug]/page.tsx");
    expect(detail).toContain("<ItemActions kind={kind}");
  });
});

describe("new keys in all six languages", () => {
  it.each(["ar", "en", "ur", "hi", "bn", "fil"])("%s has orderNow and showMore", (loc) => {
    const m = JSON.parse(code(`messages/${loc}.json`));
    expect(String(m.OrderingFlow.orderNow).trim()).not.toBe("");
    expect(String(m.DiagWeb.showMore).trim()).not.toBe("");
    if (loc !== "en") {
      expect(m.OrderingFlow.orderNow).not.toBe("Order now");
      expect(m.DiagWeb.showMore).not.toBe("Show more");
    }
  });
});
