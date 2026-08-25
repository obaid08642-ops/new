# Phase 0D semantic evidence

- **Surface:** Patient Mobile
- **Archive:** `nabd_plus_patient_app.zip`
- **Member path:** `app/diagnostics/packages.tsx`
- **Member SHA-256:** `c72bf81b33f14036eda674aacf1aef078b68b1e46ea7d41b2d84390d2ccd1ba2`
- **Line count:** 247
- **Read range:** `1-247`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `15: import { useRouter } from "expo-router";`
- `20: const router = useRouter();`
- `49: <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>`
- `82: onPress={() => setActiveCat(c)}`
- `110: onPress={() =>`
- `111: router.push(`/diagnostics/package-detail?id=${pkg.id}`)`
### backend_consumers_or_contracts
- `28: apiFetch('/labs/packages'),`
- `29: apiFetch('/labs/categories')`
### auth_ownership
- No matching static signal found in this member.
### state_transitions
- `2: import React, { useEffect, useState } from "react";`
- `21: const [activeCat, setActiveCat] = useState("الكل");`
- `22: const [loading, setLoading] = useState(true);`
- `23: const [allPackages, setAllPackages] = useState<any[]>([]);`
- `24: const [categories, setCategories] = useState<string[]>(["الكل"]);`
- `34: setLoading(false);`
- `36: console.error(err);`
- `37: setLoading(false);`
- `98: {loading ? (`
### payment_insurance_relevance
- `109: style={styles.pkgCard}`
- `132: <View style={styles.pkgPrice}>`
- `140: {pkg.price}`
- `220: pkgCard: {`
- `238: pkgPrice: { alignItems: "flex-end", justifyContent: "center" },`
### error_empty_loading_retry_cancel
- `22: const [loading, setLoading] = useState(true);`
- `34: setLoading(false);`
- `35: }).catch((err) => {`
- `36: console.error(err);`
- `37: setLoading(false);`
- `81: style={[styles.catChip, activeCat === c && styles.catChipActive]}`
- `98: {loading ? (`
- `210: catChip: {`
- `218: catChipActive: { backgroundColor: "transparent", borderColor: "transparent" },`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
