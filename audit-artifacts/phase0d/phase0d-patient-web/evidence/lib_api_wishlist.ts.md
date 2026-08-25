# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `lib/api/wishlist.ts`
- **Member SHA-256:** `13ff5c5e7522a552d14d8fcd7e2a510c7ec80447f3886e89ee51feb4e684fb05`
- **Line count:** 14
- **Read range:** `1-14`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- No matching static signal found in this member.
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- No matching static signal found in this member.
### state_transitions
- `10: const r = record(value); const id = idSchema.safeParse(r?.id); if (!r || !id.success) return null;`
### payment_insurance_relevance
- `4: export type WishlistItem = { id: string; nameAr?: string; nameEn?: string; brand?: string; price?: number; discount?: number; inStock?: boolean; requiresPrescription?: boolean };`
- `11: return { id: id.data, nameAr: text(r,["name_ar"]), nameEn: text(r,["name_en","name"]), brand: text(r,["brand"]), price: number(r,["price"]), discount: number(r,["discount"]), inStock: typeof r.inStock === "boolean" ? r.inStock : typeof r.in`
- `14: export function extractWishlist(payload: unknown): WishlistItem[] { const root=record(payload); const values=Array.isArray(payload)?payload:Array.isArray(root?.data)?root.data:Array.isArray(root?.items)?root.items:[]; return values.flatMap(`
### error_empty_loading_retry_cancel
- No matching static signal found in this member.

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
