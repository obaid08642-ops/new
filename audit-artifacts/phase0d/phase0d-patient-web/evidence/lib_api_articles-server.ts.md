# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `lib/api/articles-server.ts`
- **Member SHA-256:** `b269ba474ea30521dc9c5923a08f2c99da40765fd887634298cc5fff980df561`
- **Line count:** 18
- **Read range:** `1-18`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `8: export async function getPublicArticles(query: { q?: string; category?: string; page?: number } = {}) {`
- `18: export function getPatientArticleBookmarks(accessToken: string) { return callPatientApi("/articles/bookmarks/mine", {}, accessToken); }`
### backend_consumers_or_contracts
- `1: import { articleQuery, articleSlug } from "@/lib/api/articles";`
- `2: import { callPatientApi, patientApiUrl } from "@/lib/api/upstream";`
- `9: try { return await fetch(patientApiUrl(articleQuery(query)), { headers: { Accept: "application/json" }, cache: "force-cache" }); } catch { return null; }`
- `12: try { return await fetch(patientApiUrl("/articles/categories"), { headers: { Accept: "application/json" }, cache: "force-cache" }); } catch { return null; }`
- `16: try { return await fetch(patientApiUrl(publicArticlePath(`/articles/${slug}`)), { headers: { Accept: "application/json" }, cache: "force-cache" }); } catch { return null; }`
### auth_ownership
- `18: export function getPatientArticleBookmarks(accessToken: string) { return callPatientApi("/articles/bookmarks/mine", {}, accessToken); }`
### state_transitions
- `5: if (!path.startsWith("/articles/") || path.includes("..")) throw new Error("invalid_public_article_path");`
- `15: if (!articleSlug(slug)) throw new Error("invalid_article_slug");`
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- `5: if (!path.startsWith("/articles/") || path.includes("..")) throw new Error("invalid_public_article_path");`
- `9: try { return await fetch(patientApiUrl(articleQuery(query)), { headers: { Accept: "application/json" }, cache: "force-cache" }); } catch { return null; }`
- `12: try { return await fetch(patientApiUrl("/articles/categories"), { headers: { Accept: "application/json" }, cache: "force-cache" }); } catch { return null; }`
- `15: if (!articleSlug(slug)) throw new Error("invalid_article_slug");`
- `16: try { return await fetch(patientApiUrl(publicArticlePath(`/articles/${slug}`)), { headers: { Accept: "application/json" }, cache: "force-cache" }); } catch { return null; }`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
