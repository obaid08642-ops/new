import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ItemView } from "./item";

const loadItem = vi.fn();
vi.mock("./load-item", () => ({ loadItem: (...args: unknown[]) => loadItem(...args) }));
import { itemPreparation } from "./preparation";

const item = (over: Partial<ItemView>): ItemView => ({ id: "x", nameAr: "ا", nameEn: "x", descriptionAr: "", descriptionEn: "", preparationAr: [], preparationEn: [], included: [], isPackage: false, ...over }) as ItemView;

describe("preparation lines on the confirm step (Ord07)", () => {
  beforeEach(() => loadItem.mockReset());

  it("reads the item through the same catalogue read as the item page, for every kind", async () => {
    loadItem.mockResolvedValue({ item: item({ preparationEn: ["Do not eat for 8 hours"], preparationAr: ["صيام ٨ ساعات"] }), failed: false });
    for (const kind of ["lab", "radiology", "nursing"] as const) {
      expect(await itemPreparation(kind, "en", "abc")).toEqual(["Do not eat for 8 hours"]);
      expect(loadItem).toHaveBeenLastCalledWith(kind, "abc");
    }
    expect(await itemPreparation("radiology", "ar", "abc")).toEqual(["صيام ٨ ساعات"]);
  });

  it("answers nothing, not an invented line, when the item is unknown, has no preparation, or the catalogue fails", async () => {
    loadItem.mockResolvedValueOnce({ item: null, failed: false });
    expect(await itemPreparation("radiology", "en", "abc")).toEqual([]);
    loadItem.mockResolvedValueOnce({ item: null, failed: true });
    expect(await itemPreparation("nursing", "en", "abc")).toEqual([]);
    loadItem.mockResolvedValueOnce({ item: item({}), failed: false });
    expect(await itemPreparation("lab", "en", "abc")).toEqual([]);
  });
});
