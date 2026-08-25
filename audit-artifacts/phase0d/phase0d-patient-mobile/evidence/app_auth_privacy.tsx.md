# Phase 0D semantic evidence

- **Surface:** Patient Mobile
- **Archive:** `nabd_plus_patient_app.zip`
- **Member path:** `app/(auth)/privacy.tsx`
- **Member SHA-256:** `d4947f42d47c3f066f20486b3bdb0ab50e0d3f960cc30879e060c3c099e691b5`
- **Line count:** 158
- **Read range:** `1-158`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `12: import { router } from "expo-router";`
- `59: export default function PrivacyScreen() {`
- `94: onPress={() => router.back()}`
### backend_consumers_or_contracts
- `70: fetch(`${BASE_URL}/legal/policy/privacy_policy?lang=${AR ? "ar" : "en"}`)`
### auth_ownership
- No matching static signal found in this member.
### state_transitions
- `2: import React, { useEffect, useState } from "react";`
- `66: const [policy, setPolicy] = useState(null);`
- `67: const [loading, setLoading] = useState(true);`
- `74: .finally(() => setLoading(false));`
- `121: {loading && (`
- `124: {!loading && (`
### payment_insurance_relevance
- `47: • Health insurance data.`
### error_empty_loading_retry_cancel
- `18: // Fallback shown only when the legal service is unreachable (offline first-open).`
- `67: const [loading, setLoading] = useState(true);`
- `73: .catch(() => {})`
- `74: .finally(() => setLoading(false));`
- `121: {loading && (`
- `124: {!loading && (`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
