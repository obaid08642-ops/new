# Phase 0D semantic evidence

- **Surface:** Patient Mobile
- **Archive:** `nabd_plus_patient_app.zip`
- **Member path:** `app/(auth)/terms.tsx`
- **Member SHA-256:** `ebe6881b514da61f2b58c40b7ebb0c094398d55db50f37bf9a12fca737f9aaea`
- **Line count:** 146
- **Read range:** `1-146`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `12: import { router } from "expo-router";`
- `47: The Platform provides users with access to services offered by licensed healthcare providers, including appointment booking, medication ordering, medical consultations, and other healthcare services.`
- `55: export default function TermsScreen() {`
- `90: onPress={() => router.back()}`
### backend_consumers_or_contracts
- `66: fetch(`${BASE_URL}/legal/policy/patient_terms?lang=${AR ? "ar" : "en"}`)`
### auth_ownership
- No matching static signal found in this member.
### state_transitions
- `2: import React, { useEffect, useState } from "react";`
- `62: const [policy, setPolicy] = useState(null);`
- `63: const [loading, setLoading] = useState(true);`
- `70: .finally(() => setLoading(false));`
- `108: {loading && (`
- `111: {!loading && (`
### payment_insurance_relevance
- `47: The Platform provides users with access to services offered by licensed healthcare providers, including appointment booking, medication ordering, medical consultations, and other healthcare services.`
### error_empty_loading_retry_cancel
- `18: // Fallback shown only when the legal service is unreachable (offline first-open).`
- `63: const [loading, setLoading] = useState(true);`
- `69: .catch(() => {})`
- `70: .finally(() => setLoading(false));`
- `108: {loading && (`
- `111: {!loading && (`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
