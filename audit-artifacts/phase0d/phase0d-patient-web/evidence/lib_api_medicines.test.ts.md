# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `lib/api/medicines.test.ts`
- **Member SHA-256:** `c57b863b382d8909286974f039f400879e81f34a4c902a1554db1d0d9464a436`
- **Line count:** 22
- **Read range:** `1-22`
- **Classification:** `OWNED_TEST`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `13: expect(parseMedicineSearch({ q: "  query  ", page: "2" })).toEqual({ q: "query", page: 2 });`
- `14: expect(medicineQuery({ q: "query", page: 2 })).toBe("/medicines?limit=24&page=2&q=query");`
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- No matching static signal found in this member.
### state_transitions
- `7: it("keeps only approved display fields and excludes price, stock, images, and internal metadata", () => {`
- `9: expect(rows).toEqual([{ id: medicineId, nameAr: "Name", nameEn: undefined, activeIngredient: "Ingredient", genericName: undefined, form: undefined, strength: undefined, requiresPrescription: true, availabilityStatus: undefined }]);`
- `16: expect(parseMedicineId(medicineId).success).toBe(true);`
- `17: expect(parseMedicineId("aB_12-").success).toBe(true);`
- `18: expect(parseMedicineId("../unsafe").success).toBe(false);`
- `19: expect(parseMedicineId("invalid/id").success).toBe(false);`
### payment_insurance_relevance
- `7: it("keeps only approved display fields and excludes price, stock, images, and internal metadata", () => {`
- `8: const rows = extractMedicineRows({ data: [{ id: medicineId, name_ar: "Name", active_ingredient: "Ingredient", requires_prescription: true, price: 99, aggregate_stock: 5, updated_by: "private" }] });`
### error_empty_loading_retry_cancel
- No matching static signal found in this member.

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
