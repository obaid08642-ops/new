// Owner review G4: labs and radiology hub = one "My orders and results" button, no results/compare buttons in the place section,
// the full tests and scans (paged), a large card per item with "Add to cart" and "Order now".
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { MAX_HUB_PAGES, parseHubPages } from "@/lib/diagnostics-hub";

const code = (file: string) => readFileSync(file, "utf8");
const hub = code("app/[locale]/diagnostics/page.tsx");

describe("hub paging (pure)", () => {
  it("reads ?more= safely (the open server pages, at most MAX_HUB_PAGES)", () => {
    expect(parseHubPages(undefined)).toBe(1);
    expect(parseHubPages("abc")).toBe(1);
    expect(parseHubPages("-3")).toBe(1);
    expect(parseHubPages("3")).toBe(3);
    expect(parseHubPages("999999")).toBe(MAX_HUB_PAGES);
  });
});

describe("hub layout", () => {
  it("has a single orders-and-results entry (the shell button) and no separate results / compare / requests buttons", () => {
    expect(hub).toContain("resultsHref={`/${locale}/orders`}");
    expect(hub).not.toContain("QuickLink");
    expect(hub).not.toContain("quickResults");
    expect(hub).not.toContain("quickCompare");
    expect(hub).not.toContain('t("myRequests")');
  });
  it("lists every test and scan (no fixed LIMIT slice) with a Show more step", () => {
    expect(hub).not.toMatch(/LIMIT_(TESTS|RADIOLOGY)/);
    // the full list is the infinite client island; the server-rendered "Show more" link is its no-script step
    expect(hub).toContain("<ItemCatalog");
    expect(hub).toContain("page: okLoads.length");
    expect(hub).toContain('moreLabel: t("showMore")');
  });
  it("gives each item a card with both actions, keyed to its own service basket", () => {
    expect(hub).toContain("{...catalogProps} packageRows={packagesOpen ? packageRows : undefined} kind=\"lab\"");
    expect(hub).toContain("{...catalogProps} kind=\"radiology\"");
    expect(code("components-next/diagnostics/item-catalog.tsx")).toContain("<ItemActions kind={kind}");
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
