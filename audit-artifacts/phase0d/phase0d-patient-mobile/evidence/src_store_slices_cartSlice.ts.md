# Phase 0D semantic evidence

- **Surface:** Patient Mobile
- **Archive:** `nabd_plus_patient_app.zip`
- **Member path:** `src/store/slices/cartSlice.ts`
- **Member SHA-256:** `c6d9372d85473388ee07e9a05a49a43fc9b8dadd67484fbe0fcc5e597dc2e906`
- **Line count:** 48
- **Read range:** `1-48`
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
- `11: interface CartState {`
- `19: initialState: { items: [], couponCode: null, couponDiscount: 0 } as CartState,`
- `21: addToCart: (state, action: PayloadAction<CartItem>) => {`
- `22: const existing = state.items.find((i) => i.id === action.payload.id);`
- `26: state.items.push(action.payload);`
- `29: removeFromCart: (state, action: PayloadAction<string>) => {`
- `30: state.items = state.items.filter((i) => i.id !== action.payload);`
- `32: updateQuantity: (state, action: PayloadAction<{ id: string; quantity: number }>) => {`
- `33: const item = state.items.find((i) => i.id === action.payload.id);`
- `36: clearCart: (state) => {`
- `37: state.items = [];`
- `38: state.couponCode = null;`
### payment_insurance_relevance
- `1: import { createSlice, PayloadAction } from '@reduxjs/toolkit';`
- `6: price: number;`
- `21: addToCart: (state, action: PayloadAction<CartItem>) => {`
- `22: const existing = state.items.find((i) => i.id === action.payload.id);`
- `24: existing.quantity += action.payload.quantity;`
- `26: state.items.push(action.payload);`
- `29: removeFromCart: (state, action: PayloadAction<string>) => {`
- `30: state.items = state.items.filter((i) => i.id !== action.payload);`
- `32: updateQuantity: (state, action: PayloadAction<{ id: string; quantity: number }>) => {`
- `33: const item = state.items.find((i) => i.id === action.payload.id);`
- `34: if (item) item.quantity = action.payload.quantity;`
- `41: applyCoupon: (state, action: PayloadAction<{ code: string; discount: number }>) => {`
### error_empty_loading_retry_cancel
- No matching static signal found in this member.

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
