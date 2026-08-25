# Phase 0D semantic evidence

- **Surface:** Patient Mobile
- **Archive:** `nabd_plus_patient_app.zip`
- **Member path:** `app/profile/addresses.tsx`
- **Member SHA-256:** `73cf41a063ff135357f00b6d68326d5981644a7ef70b46a37e0bb0e30c511208`
- **Line count:** 180
- **Read range:** `1-180`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `11: import { router } from "expo-router";`
- `19: export default function AddressesScreen() {`
- `85: onPress={() => router.back()}`
- `108: onPress={() => handleSetDefault(addr.id)}`
### backend_consumers_or_contracts
- `29: const data = await apiFetch("/users/me/addresses");`
- `46: await apiFetch(`/users/me/addresses/${id}`, {`
### auth_ownership
- No matching static signal found in this member.
### state_transitions
- `2: import React, { useState, useEffect } from "react";`
- `22: const [addresses, setAddresses] = useState<any[]>([]);`
- `23: const [loading, setLoading] = useState(true);`
- `34: setLoading(false);`
- `90: {loading ? (`
### payment_insurance_relevance
- `100: st.card,`
- `173: card: { padding: 16, borderRadius: 16, borderWidth: 1.5 },`
### error_empty_loading_retry_cancel
- `23: const [loading, setLoading] = useState(true);`
- `31: } catch {`
- `34: setLoading(false);`
- `40: // E2: optimistic update with revert + alert on failure (was silent catch{} — UI lied about the default)`
- `50: } catch (e: any) {`
- `90: {loading ? (`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
