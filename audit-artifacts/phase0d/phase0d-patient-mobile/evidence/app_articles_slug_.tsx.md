# Phase 0D semantic evidence

- **Surface:** Patient Mobile
- **Archive:** `nabd_plus_patient_app.zip`
- **Member path:** `app/articles/[slug].tsx`
- **Member SHA-256:** `e35a6ae3ba41b44894f68bbf9f1999cfba23f43d77c21b186a9f1844e641e1fb`
- **Line count:** 199
- **Read range:** `1-199`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `2: // app/articles/[slug].tsx — Article detail (REAL: GET /articles/:slug + bookmarks)`
- `14: import { router, useLocalSearchParams } from "expo-router";`
- `23: export default function ArticleDetailScreen() {`
- `32: const [bookmarked, setBookmarked] = useState(false);`
- `45: // Bookmark status (auth only — failure just means not logged in)`
- `46: const st = await apiFetch(`/articles/bookmarks/${encodeURIComponent(String(slug))}/status`).catch(() => null);`
- `47: setBookmarked(!!st?.bookmarked);`
- `57: const toggleBookmark = async () => {`
- `59: const res = await apiFetch(`/articles/bookmarks/${encodeURIComponent(String(slug))}/toggle`, { method: "POST" });`
- `60: setBookmarked(!!res?.bookmarked);`
- `84: <Button label="العودة" variant="gradient" icon="back" onPress={() => router.back()} />`
- `103: <IconButton icon="share" onPress={share} />`
### backend_consumers_or_contracts
- `38: const res = await apiFetch(`/articles/${encodeURIComponent(String(slug))}`);`
- `42: const rel = await apiFetch(`/articles?category=${encodeURIComponent(res.category)}&limit=4`).catch(() => []);`
- `46: const st = await apiFetch(`/articles/bookmarks/${encodeURIComponent(String(slug))}/status`).catch(() => null);`
- `59: const res = await apiFetch(`/articles/bookmarks/${encodeURIComponent(String(slug))}/toggle`, { method: "POST" });`
### auth_ownership
- No matching static signal found in this member.
### state_transitions
- `3: import React, { useCallback, useEffect, useState } from "react";`
- `8: StatusBar,`
- `28: const [loading, setLoading] = useState(true);`
- `29: const [error, setError] = useState<string | null>(null);`
- `30: const [article, setArticle] = useState<any>(null);`
- `31: const [related, setRelated] = useState<any[]>([]);`
- `32: const [bookmarked, setBookmarked] = useState(false);`
- `36: setLoading(true);`
- `37: setError(null);`
- `40: // Related: same category, exclude self — real data, honest if empty`
- `45: // Bookmark status (auth only — failure just means not logged in)`
- `46: const st = await apiFetch(`/articles/bookmarks/${encodeURIComponent(String(slug))}/status`).catch(() => null);`
### payment_insurance_relevance
- `18: import { AppText, Card, Badge, IconButton, Button } from "../../src/components/ui";`
- `166: <Card style={{ flexDirection: "row-reverse", gap: 12, alignItems: "center" }}>`
- `178: </Card>`
### error_empty_loading_retry_cancel
- `28: const [loading, setLoading] = useState(true);`
- `29: const [error, setError] = useState<string | null>(null);`
- `36: setLoading(true);`
- `37: setError(null);`
- `40: // Related: same category, exclude self — real data, honest if empty`
- `42: const rel = await apiFetch(`/articles?category=${encodeURIComponent(res.category)}&limit=4`).catch(() => []);`
- `46: const st = await apiFetch(`/articles/bookmarks/${encodeURIComponent(String(slug))}/status`).catch(() => null);`
- `48: } catch (e: any) {`
- `49: setError(e?.message || "تعذر تحميل المقال");`
- `51: setLoading(false);`
- `61: } catch { /* guest or network — keep current state */ }`
- `68: } catch {}`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
