import { readFileSync } from "node:fs";
import { join } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
vi.mock("@/components-next/pharmacy/order-again-card", () => ({ OrderAgainCard: () => null })); // a client card with its own translations; not the tile
import { HomeQuickTiles } from "@/components-next/pharmacy/home-quick-tiles";

const read = (rel: string) => readFileSync(join(__dirname, "..", rel), "utf8");
const labels = { shortcuts: "Shortcuts", reminders: "Reminders", orders: "My orders" };

describe("Home Reminders tile", () => {
  it("opens the medication reminders list (the 'All reminders' tab of /health/medications)", () => {
    const html = renderToStaticMarkup(<HomeQuickTiles locale="en" disabled={{} as never} labels={labels} />);
    expect(html).toContain('href="/en/health/medications?tab=all"');
    const page = read("app/[locale]/health/medications/page.tsx");
    expect(page).toMatch(/const TABS = \[[^\]]*"all"/);
    expect(page).toContain('label: t("medsAll")');
    expect(JSON.parse(read("messages/en.json")).HealthWeb.medsAll).toBe("All reminders");
  });
});

describe("pharmacy catalogue sort chips", () => {
  const view = read("app/[locale]/c/[[...category]]/category-view.tsx");
  it("selects a chip only when the patient picked one; the default order is Recommended", () => {
    expect(view).toContain("selected={pickedSort === o.id}");
    expect(view).not.toContain("selected={sort === o.id}");
  });
  it("uses the owner wording in all six languages", () => {
    const want: Record<string, string[]> = {
      en: ["Most ordered", "Lowest price", "Highest price", "Newest", "Recommended"],
      ar: ["الأكثر طلبًا", "الأقل سعرًا", "الأعلى سعرًا", "الأحدث", "المقترح"],
      ur: ["سب سے زیادہ آرڈر کیے گئے", "کم ترین قیمت", "زیادہ ترین قیمت", "نیا ترین", "تجویز کردہ"],
      hi: ["सबसे ज़्यादा ऑर्डर किए गए", "सबसे कम कीमत", "सबसे अधिक कीमत", "नवीनतम", "अनुशंसित"],
      bn: ["সবচেয়ে বেশি অর্ডার করা", "সর্বনিম্ন মূল্য", "সর্বোচ্চ মূল্য", "সর্বশেষ", "প্রস্তাবিত"],
      fil: ["Pinakamaraming na-order", "Pinakamababang presyo", "Pinakamataas na presyo", "Pinakabago", "Inirerekomenda"],
    };
    for (const [l, v] of Object.entries(want)) {
      const p = JSON.parse(read(`messages/${l}.json`)).PharmacyBrowse;
      expect([p.sortPopular, p.sortPriceAsc, p.sortPriceDesc, p.sortNewest, p.sortRecommended], l).toEqual(v);
    }
  });
});
