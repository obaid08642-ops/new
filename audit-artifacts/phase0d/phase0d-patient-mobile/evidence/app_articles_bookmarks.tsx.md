# Phase 0D semantic evidence

- **Surface:** Patient Mobile
- **Archive:** `nabd_plus_patient_app.zip`
- **Member path:** `app/articles/bookmarks.tsx`
- **Member SHA-256:** `80f15ba95db7a0c7dedeb35274267e9e62d58cd45048515a7c6b574fbec8787a`
- **Line count:** 118
- **Read range:** `1-118`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `2: // app/articles/bookmarks.tsx — My saved articles (REAL: GET /articles/bookmarks/mine)`
- `13: import { router } from "expo-router";`
- `21: export default function ArticleBookmarksScreen() {`
- `33: const res = await apiFetch("/articles/bookmarks/mine");`
- `59: <IconButton icon="back" onPress={() => router.back()} />`
- `70: <Button label="إعادة المحاولة" variant="gradient" icon="refresh" onPress={load} />`
- `74: <Icon name="bookmark-outline" size={44} color={colors.textTertiary} />`
- `78: <Button label="تصفح المقالات" variant="gradient" icon="document" onPress={() => router.push("/articles")} />`
- `86: onPress={() => router.push({ pathname: "/articles/[slug]", params: { slug: a.slug } })}`
- `98: <Icon name="bookmark" size={20} color={colors.primary} />`
### backend_consumers_or_contracts
- `33: const res = await apiFetch("/articles/bookmarks/mine");`
### auth_ownership
- `70: <Button label="إعادة المحاولة" variant="gradient" icon="refresh" onPress={load} />`
### state_transitions
- `3: import React, { useCallback, useEffect, useState } from "react";`
- `8: StatusBar,`
- `25: const [loading, setLoading] = useState(true);`
- `26: const [error, setError] = useState<string | null>(null);`
- `27: const [articles, setArticles] = useState<any[]>([]);`
- `31: setLoading(true);`
- `32: setError(null);`
- `36: setError(e?.message || "تعذر تحميل المحفوظات");`
- `38: setLoading(false);`
- `46: <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />`
- `62: {loading ? (`
- `66: ) : error ? (`
### payment_insurance_relevance
- `17: import { AppText, Card, Badge, IconButton, Button } from "../../src/components/ui";`
- `88: <Card style={{ flexDirection: "row-reverse", gap: 12, alignItems: "center" }}>`
- `99: </Card>`
### error_empty_loading_retry_cancel
- `25: const [loading, setLoading] = useState(true);`
- `26: const [error, setError] = useState<string | null>(null);`
- `31: setLoading(true);`
- `32: setError(null);`
- `35: } catch (e: any) {`
- `36: setError(e?.message || "تعذر تحميل المحفوظات");`
- `38: setLoading(false);`
- `62: {loading ? (`
- `66: ) : error ? (`
- `69: <AppText variant="bodySM" color={colors.textSecondary} align="center">{error}</AppText>`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
