# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `lib/api/articles.ts`
- **Member SHA-256:** `2a81d9510c8abb1f12f1baca7675100b947b3f6f926b7de88eb1087258ebd3f9`
- **Line count:** 14
- **Read range:** `1-14`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `14: export function articleQuery(input: { q?: string; category?: string; page?: number }) { const params=new URLSearchParams({ limit:"20", page:String(Math.max(1, Math.min(1000, Math.floor(input.page ?? 1)))) }); const q=input.q?.trim().slice(0`
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- No matching static signal found in this member.
### state_transitions
- `9: function mapArticle(value: unknown): ArticleSummary | null { const parsed=articleSchema.safeParse(value); if (!parsed.success) return null; const a=parsed.data; return { id:a.id, slug:a.slug, titleAr:a.title_ar, titleEn:a.title_en, excerptA`
### payment_insurance_relevance
- `8: function root(payload: unknown): unknown { if (Array.isArray(payload)) return payload; if (!payload || typeof payload !== "object") return []; const r=payload as Record<string,unknown>; return r.data ?? r.articles ?? []; }`
- `10: export function parseArticleList(payload: unknown): ArticleSummary[] { const list=root(payload); return Array.isArray(list) ? list.flatMap((value)=>{const a=mapArticle(value); return a?[a]:[]}) : []; }`
- `11: export function parseArticle(payload: unknown): ArticleSummary | null { const list=parseArticleList(payload); return list[0] ?? null; }`
- `13: export function parseArticleCategories(payload: unknown): string[] { const list: unknown[] = Array.isArray(payload) ? payload : payload && typeof payload === "object" && Array.isArray((payload as Record<string, unknown>).data) ? (payload as`
### error_empty_loading_retry_cancel
- No matching static signal found in this member.

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
