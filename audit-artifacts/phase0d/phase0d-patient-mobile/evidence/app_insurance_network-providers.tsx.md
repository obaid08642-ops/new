# Phase 0D semantic evidence

- **Surface:** Patient Mobile
- **Archive:** `nabd_plus_patient_app.zip`
- **Member path:** `app/insurance/network-providers.tsx`
- **Member SHA-256:** `c4839e5baf194593122eb7919e1f5b1143204d68711f6f3a4f03d9f53f8ef249`
- **Line count:** 345
- **Read range:** `1-345`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `13: import { router } from "expo-router";`
- `39: export default function NetworkProvidersScreen() {`
- `92: <TouchableOpacity onPress={() => router.back()}>`
- `132: onPress={() => setFilter(t.id)}`
- `177: <TouchableOpacity onPress={() => router.push("/insurance/add-policy")}>`
- `218: onPress={() => Linking.openURL(`tel:${item.phone}`)}`
### backend_consumers_or_contracts
- `2: // app/insurance/network-providers.tsx — مزودو شبكة تأمين المريض (بيانات حقيقية)`
- `52: const profile = await apiFetch("/users/me/profile").catch(() => null);`
- `63: const res = await apiFetch(`/providers?${qs.toString()}`).catch(() => []);`
- `177: <TouchableOpacity onPress={() => router.push("/insurance/add-policy")}>`
### auth_ownership
- No matching static signal found in this member.
### state_transitions
- `3: import React, { useEffect, useState } from "react";`
- `43: const [filter, setFilter] = useState("all");`
- `44: const [query, setQuery] = useState("");`
- `45: const [loading, setLoading] = useState(true);`
- `46: const [providers, setProviders] = useState<any[]>([]);`
- `47: const [insurance, setInsurance] = useState<any>(null);`
- `66: setLoading(false);`
- `160: {loading ? (`
- `168: ListEmptyComponent={`
### payment_insurance_relevance
- `2: // app/insurance/network-providers.tsx — مزودو شبكة تأمين المريض (بيانات حقيقية)`
- `47: const [insurance, setInsurance] = useState<any>(null);`
- `53: const ins = profile?.insurance || null;`
- `54: setInsurance(ins);`
- `60: qs.set("insurance_company", ins.company_id || ins.provider);`
- `61: if (ins.network) qs.set("insurance_network", ins.network);`
- `62: if (ins.class) qs.set("insurance_class", ins.class);`
- `172: {insurance?.provider`
- `176: {!insurance?.provider && (`
- `177: <TouchableOpacity onPress={() => router.push("/insurance/add-policy")}>`
- `195: styles.providerCard,`
- `316: providerCard: { borderRadius: 16, padding: 14 },`
### error_empty_loading_retry_cancel
- `45: const [loading, setLoading] = useState(true);`
- `52: const profile = await apiFetch("/users/me/profile").catch(() => null);`
- `63: const res = await apiFetch(`/providers?${qs.toString()}`).catch(() => []);`
- `66: setLoading(false);`
- `160: {loading ? (`
- `168: ListEmptyComponent={`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
