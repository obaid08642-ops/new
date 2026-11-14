import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { emptyBasket, MAX_BASKET_ITEMS } from "./basket";
import { MAX_PREFILL, parseOrderId, parsePrefillIds, prefillCatalogIds, prefillTarget, seedBasket } from "./prefill";

const read = (rel: string) => readFileSync(join(__dirname, "..", "..", rel), "utf8");
const back = new URL("https://nabd.test/en/labs/basket");
const ORDER = "91047ef2-ad36-422a-a184-629693e7c729";
const payload = { prefill: { service_kind: "lab", medical_order_id: ORDER, items: [{ item_id: "i1", catalog_id: "c1" }, { item_id: "i2", catalog_id: "c2" }] } };

describe("owner decision 2026-11-08 (2): the doctor's order items arrive pre-checked in the basket", () => {
  it("reads the catalogue ids of the address: plain ids only, no duplicates, at most the limit", () => {
    expect(parsePrefillIds("a1,b2,a1,../x,,c3")).toEqual(["a1", "b2", "c3"]);
    expect(parsePrefillIds(undefined)).toEqual([]);
    expect(parsePrefillIds(Array.from({ length: 40 }, (_, i) => `id${i}`).join(","))).toHaveLength(MAX_PREFILL);
    expect(parseOrderId(ORDER)).toBe(ORDER);
    expect(parseOrderId("x")).toBeNull();
    expect(parseOrderId("a b c d e f g h")).toBeNull();
  });

  it("takes the catalogue ids from the backend's prefill, nothing else", () => {
    expect(prefillCatalogIds(payload)).toEqual(["c1", "c2"]);
    expect(prefillCatalogIds(null)).toEqual([]);
    expect(prefillCatalogIds({ prefill: { items: "no" } })).toEqual([]);
    expect(prefillCatalogIds({ prefill: { items: [{ item_id: "i1" }, { catalog_id: 5 }, null] } })).toEqual([]);
  });

  it("sends the patient to the basket with the order and its items; any other target, or nothing to carry, is left as it is", () => {
    const target = prefillTarget(back, ORDER, payload);
    expect(target.pathname).toBe("/en/labs/basket");
    expect(target.searchParams.get("order")).toBe(ORDER);
    expect(target.searchParams.get("pre")).toBe("c1,c2");
    expect(prefillTarget(new URL("https://nabd.test/en/nursing"), ORDER, payload).toString()).toBe("https://nabd.test/en/nursing");
    expect(prefillTarget(back, ORDER, { prefill: { items: [] } }).toString()).toBe(back.toString());
    expect(prefillTarget(back, "bad", payload).toString()).toBe(back.toString());
    const radiology = prefillTarget(new URL("https://nabd.test/en/labs/basket?kind=radiology"), ORDER, payload);
    expect(radiology.searchParams.get("kind")).toBe("radiology");
    expect(radiology.searchParams.get("pre")).toBe("c1,c2");
  });

  it("seeds the basket with every item, keeps a line that is already there, and keeps the basket's own limit", () => {
    const seeded = seedBasket(emptyBasket(), "lab", [{ id: "c1", nameEn: "CBC" }, { id: "c2", nameAr: "سكر" }]);
    expect(seeded.lab.map((l) => l.id)).toEqual(["c1", "c2"]);
    const again = seedBasket(seeded, "lab", [{ id: "c2", nameEn: "other" }, { id: "c3" }]);
    expect(again.lab.map((l) => l.id)).toEqual(["c1", "c2", "c3"]);
    expect(again.lab.find((l) => l.id === "c2")?.nameAr).toBe("سكر"); // not overwritten
    const many = seedBasket(emptyBasket(), "radiology", Array.from({ length: MAX_BASKET_ITEMS + 5 }, (_, i) => ({ id: `r${i}` })));
    expect(many.radiology).toHaveLength(MAX_BASKET_ITEMS);
  });

  it("is wired: the Order route hands the prefill on, the order group opens the basket, the page shows the checklist, and nothing is locked", () => {
    expect(read("app/api/medical-orders/[orderId]/items/[itemId]/[action]/route.ts")).toContain("prefillTarget(back, orderId, payload)");
    const page = read("app/[locale]/labs/basket/page.tsx");
    expect(page).toContain("<DoctorOrderPrefill");
    expect(page).toContain('kind !== "nursing"');
    const comp = read("components-next/ordering/doctor-order-prefill.tsx");
    expect(comp).toContain('type="checkbox"');
    expect(comp).toContain("on ? remove(kind, line.id) : add(kind, line)"); // ticked can be unticked, unticked ticked again
    expect(comp).not.toMatch(/disabled|readOnly/);
  });

  it.each(["ar", "en", "ur", "hi", "bn", "fil"])("the two strings exist in %s", async (l) => {
    const m = (await import(`../../messages/${l}.json`)).default as { OrderingFlow: Record<string, string> };
    expect((m.OrderingFlow.fromOrderTitle ?? "").length).toBeGreaterThan(5);
    expect((m.OrderingFlow.fromOrderSub ?? "").length).toBeGreaterThan(15);
  });
});
