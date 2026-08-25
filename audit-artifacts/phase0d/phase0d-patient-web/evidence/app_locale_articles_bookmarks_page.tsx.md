# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `app/[locale]/articles/bookmarks/page.tsx`
- **Member SHA-256:** `661b44e7c0da0025083be561409c4d8698d9d817aac24e3987b047047b7b6fa4`
- **Line count:** 12
- **Read range:** `1-12`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `3: import { Bookmark, ChevronLeft, FileText } from "lucide-react";`
- `5: import { getPatientArticleBookmarks } from "@/lib/api/articles-server";`
- `9: import { RetryButton } from "@/components-next/retry-button";`
- `12: export default async function ArticleBookmarksPage({params}:Props){const {locale}=await params;if(!isLocale(locale))notFound();setRequestLocale(locale);const t=await getTranslations("Articles");const token=await requirePatientAccess(locale)`
### backend_consumers_or_contracts
- `5: import { getPatientArticleBookmarks } from "@/lib/api/articles-server";`
- `6: import { parseArticleList } from "@/lib/api/articles";`
- `7: import { requirePatientAccess } from "@/lib/auth/session";`
### auth_ownership
- `7: import { requirePatientAccess } from "@/lib/auth/session";`
- `12: export default async function ArticleBookmarksPage({params}:Props){const {locale}=await params;if(!isLocale(locale))notFound();setRequestLocale(locale);const t=await getTranslations("Articles");const token=await requirePatientAccess(locale)`
### state_transitions
- `9: import { RetryButton } from "@/components-next/retry-button";`
- `12: export default async function ArticleBookmarksPage({params}:Props){const {locale}=await params;if(!isLocale(locale))notFound();setRequestLocale(locale);const t=await getTranslations("Articles");const token=await requirePatientAccess(locale)`
### payment_insurance_relevance
- `12: export default async function ArticleBookmarksPage({params}:Props){const {locale}=await params;if(!isLocale(locale))notFound();setRequestLocale(locale);const t=await getTranslations("Articles");const token=await requirePatientAccess(locale)`
### error_empty_loading_retry_cancel
- `9: import { RetryButton } from "@/components-next/retry-button";`
- `12: export default async function ArticleBookmarksPage({params}:Props){const {locale}=await params;if(!isLocale(locale))notFound();setRequestLocale(locale);const t=await getTranslations("Articles");const token=await requirePatientAccess(locale)`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
