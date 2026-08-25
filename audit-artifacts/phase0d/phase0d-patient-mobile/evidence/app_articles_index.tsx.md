# Phase 0D semantic evidence

- **Surface:** Patient Mobile
- **Archive:** `nabd_plus_patient_app.zip`
- **Member path:** `app/articles/index.tsx`
- **Member SHA-256:** `d8c8a8004295468bf49b392951ff83db0063df167470f69ac960e3632068aa99`
- **Line count:** 214
- **Read range:** `1-214`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `13: import { router } from "expo-router";`
- `29: export default function ArticlesScreen() {`
- `71: const submitSearch = () => load(activeCategory, search);`
- `86: <IconButton icon="back" onPress={() => router.back()} />`
- `88: <IconButton icon="bookmark" onPress={() => router.push("/articles/bookmarks")} />`
- `98: onSubmitEditing={submitSearch}`
- `115: onPress={() => pickCategory(c)}`
- `141: <Button label="إعادة المحاولة" variant="gradient" icon="refresh" onPress={() => load()} />`
- `158: onPress={() => router.push({ pathname: "/articles/[slug]", params: { slug: a.slug } })}`
### backend_consumers_or_contracts
- `48: const res = await apiFetch(`/articles?${params.toString()}`);`
- `58: apiFetch("/articles/categories")`
### auth_ownership
- `141: <Button label="إعادة المحاولة" variant="gradient" icon="refresh" onPress={() => load()} />`
### state_transitions
- `3: import React, { useCallback, useEffect, useState } from "react";`
- `8: StatusBar,`
- `33: const [loading, setLoading] = useState(true);`
- `34: const [error, setError] = useState<string | null>(null);`
- `35: const [articles, setArticles] = useState<any[]>([]);`
- `36: const [categories, setCategories] = useState<string[]>([]);`
- `37: const [activeCategory, setActiveCategory] = useState<string>("");`
- `38: const [search, setSearch] = useState("");`
- `42: setLoading(true);`
- `43: setError(null);`
- `51: setError(e?.message || "تعذر تحميل المقالات");`
- `53: setLoading(false);`
### payment_insurance_relevance
- `19: Card,`
- `160: <Card padding={0} style={{ overflow: "hidden" }}>`
- `194: </Card>`
### error_empty_loading_retry_cancel
- `33: const [loading, setLoading] = useState(true);`
- `34: const [error, setError] = useState<string | null>(null);`
- `42: setLoading(true);`
- `43: setError(null);`
- `50: } catch (e: any) {`
- `51: setError(e?.message || "تعذر تحميل المقالات");`
- `53: setLoading(false);`
- `60: .catch(() => setCategories([]));`
- `133: {loading ? (`
- `137: ) : error ? (`
- `140: <AppText variant="bodySM" color={colors.textSecondary} align="center">{error}</AppText>`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
