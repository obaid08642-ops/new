# Phase 0D semantic evidence

- **Surface:** Patient Mobile
- **Archive:** `nabd_plus_patient_app.zip`
- **Member path:** `app/(onboarding)/language.tsx`
- **Member SHA-256:** `9aa06113ba8133da4b19cc32b57bcd1535086abef8cfb1fb8105f25d69578979`
- **Line count:** 69
- **Read range:** `1-69`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `4: import { router } from 'expo-router';`
- `20: export default function LanguageScreen() {`
- `40: onPress={() => setSelected(l.code)}`
- `58: <Button label="متابعة" variant="gradient" size="lg" iconRight="chevronLeft" onPress={() => { setLang(selected); router.replace('/(auth)/welcome'); }} />`
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- No matching static signal found in this member.
### state_transitions
- `2: import React, { useState } from 'react';`
- `23: const [selected, setSelected] = useState<LangCode>(lang);`
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- No matching static signal found in this member.

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
