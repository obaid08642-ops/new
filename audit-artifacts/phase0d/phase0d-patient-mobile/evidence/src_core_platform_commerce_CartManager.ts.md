# Phase 0D semantic evidence

- **Surface:** Patient Mobile
- **Archive:** `nabd_plus_patient_app.zip`
- **Member path:** `src/core/platform/commerce/CartManager.ts`
- **Member SHA-256:** `fd921a02d67794fe5c8aa40d08b93ffd38f8cfc90874775886d7620a4dba4e0f`
- **Line count:** 121
- **Read range:** `1-121`
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
- `37: throw new Error(`Quantity ${item.quantity} violates rules (min: ${quantityRules.min}, max: ${quantityRules.max})`);`
- `89: status: 'pending'`
### payment_insurance_relevance
- `10: subtotal: Money;`
- `11: tax: Money;`
- `14: total: Money;`
- `21: unit_price: number;`
- `57: unit_price: item.unitPrice.amount,`
- `86: unitPrice: { amount: dbItem.unit_price, currency: 'SAR' },`
- `93: public async calculateSummary(taxRate: number, deliveryFeeValue: number): Promise<CartSummary> {`
- `95: const subtotal = items.reduce((acc, item) => acc + (item.unitPrice.amount * item.quantity), 0);`
- `96: const tax = subtotal * taxRate;`
- `98: const total = subtotal + tax + deliveryFeeValue - discount;`
- `104: subtotal: { amount: subtotal, currency },`
- `105: tax: { amount: tax, currency },`
### error_empty_loading_retry_cancel
- `37: throw new Error(`Quantity ${item.quantity} violates rules (min: ${quantityRules.min}, max: ${quantityRules.max})`);`
- `89: status: 'pending'`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
