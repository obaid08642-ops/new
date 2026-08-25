# Phase 0D semantic evidence

- **Surface:** Patient Mobile
- **Archive:** `nabd_plus_patient_app.zip`
- **Member path:** `app/wallet/topup.tsx`
- **Member SHA-256:** `1a30494132fc450df28200e370b711527682c5fd3e0a08848b0a189b5262d127`
- **Line count:** 264
- **Read range:** `1-264`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `10: import { router } from "expo-router";`
- `25: export default function Screen() {`
- `30: const [submitting, setSubmitting] = useState(false);`
- `46: setSubmitting(true);`
- `54: // Step 2: pay through the hosted checkout; processing screen confirms + credits.`
- `55: router.push({`
- `67: setSubmitting(false);`
- `84: onPress={() => router.back()}`
- `116: onPress={() => setAmountStr(String(p))}`
- `184: onPress={handleTopup}`
- `185: disabled={submitting || !amountValid}`
- `187: st.submitBtn,`
### backend_consumers_or_contracts
- `2: // app/wallet/topup.tsx — REAL gateway-backed top-up.`
- `3: // POST /wallet/topup creates a Moyasar payment intent; the wallet is credited ONLY`
- `4: // after the gateway confirms payment (via /payments/processing → /wallet/topup/confirm).`
- `33: apiFetch<{ balance: number }>("/wallet/balance")`
- `49: const intent = await apiFetch<any>("/wallet/topup", {`
### auth_ownership
- No matching static signal found in this member.
### state_transitions
- `5: import React, { useState, useEffect } from "react";`
- `7: View, StyleSheet, ScrollView, StatusBar, Alert,`
- `28: const [balance, setBalance] = useState(0);`
- `29: const [amountStr, setAmountStr] = useState("100");`
- `30: const [submitting, setSubmitting] = useState(false);`
- `53: if (!intent?.topup_id) throw new Error("intent_failed");`
- `73: <StatusBar barStyle="light-content" />`
### payment_insurance_relevance
- `2: // app/wallet/topup.tsx — REAL gateway-backed top-up.`
- `3: // POST /wallet/topup creates a Moyasar payment intent; the wallet is credited ONLY`
- `4: // after the gateway confirms payment (via /payments/processing → /wallet/topup/confirm).`
- `16: Card,`
- `33: apiFetch<{ balance: number }>("/wallet/balance")`
- `48: // Step 1: create a payment intent — NO money is credited here.`
- `49: const intent = await apiFetch<any>("/wallet/topup", {`
- `54: // Step 2: pay through the hosted checkout; processing screen confirms + credits.`
- `56: pathname: "/payments/processing",`
- `58: moyasarId: intent.moyasar_id || "",`
- `59: paymentUrl: intent.payment_url || "",`
- `60: walletTopupId: intent.topup_id,`
### error_empty_loading_retry_cancel
- `35: .catch(() => {});`
- `53: if (!intent?.topup_id) throw new Error("intent_failed");`
- `64: } catch (e: any) {`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
