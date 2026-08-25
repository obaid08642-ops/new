# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `lib/api/wishlist.test.ts`
- **Member SHA-256:** `bf4d69a8584da4481d612d5fbe46445f626b1d6c9ad6aca111e43d38aa087f3d`
- **Line count:** 12
- **Read range:** `1-12`
- **Classification:** `OWNED_TEST`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- No matching static signal found in this member.
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- No matching static signal found in this member.
### state_transitions
- `9: expect(parseWishlistItemId("med-1").success).toBe(true);`
- `10: expect(parseWishlistItemId("../private").success).toBe(false);`
### payment_insurance_relevance
- `6: expect(extractWishlist({ data: [{ id: "med-1", name_ar: "دواء", name_en: "Medicine", price: 12.5, in_stock: true, private_note: "drop" }, { id: "" }] })).toEqual([{ id: "med-1", nameAr: "دواء", nameEn: "Medicine", price: 12.5, inStock: true`
### error_empty_loading_retry_cancel
- No matching static signal found in this member.

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
