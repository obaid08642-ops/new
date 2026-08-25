# Phase 0D semantic evidence

- **Surface:** Patient Mobile
- **Archive:** `nabd_plus_patient_app.zip`
- **Member path:** `app/diagnostics/search.tsx`
- **Member SHA-256:** `8e7e8928ad02df3e8dca95ca5d41c4c07c3331fb2611a07d7e35baf8c97cae11`
- **Line count:** 148
- **Read range:** `1-148`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `10: import { router } from "expo-router";`
- `18: export default function DiagSearchScreen() {`
- `72: <IconButton icon="back" onPress={() => router.back()} />`
- `96: onPress={() =>`
- `97: router.push({`
### backend_consumers_or_contracts
- `29: const res = await apiFetch("/labs/services");`
### auth_ownership
- No matching static signal found in this member.
### state_transitions
- `2: import React, { useState, useEffect } from "react";`
- `7: StatusBar,`
- `21: const [q, setQ] = useState("");`
- `22: const [tests, setTests] = useState<any[]>([]);`
- `23: const [loading, setLoading] = useState(false);`
- `28: setLoading(true);`
- `43: setLoading(false);`
- `52: <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />`
- `75: {loading ? (`
### payment_insurance_relevance
- `14: import { AppText, Card, Input, IconButton } from "../../src/components/ui";`
- `35: price: t.price || t.base_price || 0,`
- `94: <Card`
- `120: {t.price} ر.س`
- `122: </Card>`
### error_empty_loading_retry_cancel
- `23: const [loading, setLoading] = useState(false);`
- `28: setLoading(true);`
- `40: } catch {`
- `43: setLoading(false);`
- `75: {loading ? (`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
