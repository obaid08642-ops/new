# Phase 0D semantic evidence

- **Surface:** Patient Mobile
- **Archive:** `nabd_plus_patient_app.zip`
- **Member path:** `app/wallet/transactions.tsx`
- **Member SHA-256:** `2c72048b63d178b902dfe8d02ea41da06db67a2b52ccbe3856f312ced752a67d`
- **Line count:** 222
- **Read range:** `1-222`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `5: import { router } from "expo-router";`
- `29: export default function WalletTransactionsScreen() {`
- `83: <TouchableOpacity onPress={() => router.back()}>`
- `98: onPress={() => setFilter(f)}`
### backend_consumers_or_contracts
- `2: // app/wallet/transactions.tsx`
- `39: apiFetch('/wallet/transactions')`
### auth_ownership
- No matching static signal found in this member.
### state_transitions
- `3: import React, { useState } from "react";`
- `33: const [filter, setFilter] = useState("الكل");`
- `35: const [allTx, setAllTx] = useState<any[]>([]);`
- `36: const [loading, setLoading] = useState(true);`
- `56: .catch(console.error)`
- `57: .finally(() => setLoading(false));`
- `109: {loading ? (`
### payment_insurance_relevance
- `2: // app/wallet/transactions.tsx`
- `11: Card,`
- `29: export default function WalletTransactionsScreen() {`
- `39: apiFetch('/wallet/transactions')`
- `51: icon: t.type === 'topup' ? 'wallet' : t.type === 'transfer' ? 'swap_horiz' : t.type === 'credit' ? 'arrow_downward' : 'arrow_upward'`
- `120: styles.txCard,`
- `195: txCard: {`
### error_empty_loading_retry_cancel
- `36: const [loading, setLoading] = useState(true);`
- `56: .catch(console.error)`
- `57: .finally(() => setLoading(false));`
- `109: {loading ? (`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
