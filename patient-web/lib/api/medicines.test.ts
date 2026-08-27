import { describe, expect, it } from "vitest";
import { extractMedicineDetail, extractMedicineRows, medicineQuery, parseMedicineId, parseMedicineSearch } from "./medicines";

const medicineId = "91047ef2-ad36-422a-a184-629693e7c729";

describe("medicine response guards", () => {
  it("keeps only approved display fields and excludes price, stock, images, and internal metadata", () => {
    const rows = extractMedicineRows({ data: [{ id: medicineId, name_ar: "Name", active_ingredient: "Ingredient", requires_prescription: true, price: 99, aggregate_stock: 5, updated_by: "private" }] });
    expect(rows).toEqual([{ id: medicineId, nameAr: "Name", nameEn: undefined, activeIngredient: "Ingredient", genericName: undefined, form: undefined, strength: undefined, requiresPrescription: true, availabilityStatus: undefined }]);
  });

  it("bounds search inputs and accepts only safe medicine identifier characters", () => {
    expect(parseMedicineSearch({ q: "  query  ", page: "2" })).toEqual({ q: "query", page: 2 });
    expect(medicineQuery({ q: "query", page: 2 })).toBe("/medicines?limit=24&page=2&q=query");
    expect(() => parseMedicineSearch({ q: "x".repeat(81) })).toThrow();
    expect(parseMedicineId(medicineId).success).toBe(true);
    expect(parseMedicineId("aB_12-").success).toBe(true);
    expect(parseMedicineId("../unsafe").success).toBe(false);
    expect(parseMedicineId("invalid/id").success).toBe(false);
    expect(extractMedicineDetail({ id: "invalid/id" })).toBeNull();
  });
});
