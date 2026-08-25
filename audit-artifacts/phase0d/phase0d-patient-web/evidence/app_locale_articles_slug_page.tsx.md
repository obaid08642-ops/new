# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `app/[locale]/articles/[slug]/page.tsx`
- **Member SHA-256:** `6891bdb73512bc1d5ef6cddc24113ab95930d6fee771bc28ba4ec53f713b59ca`
- **Line count:** 11
- **Read range:** `1-11`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `8: import { RetryButton } from "@/components-next/retry-button";`
- `11: export default async function ArticlePage({params}:Props){const {locale,slug}=await params;if(!isLocale(locale)||!articleSlug(slug))notFound();setRequestLocale(locale);const t=await getTranslations("Articles");const response=await getPublic`
### backend_consumers_or_contracts
- `5: import { getPublicArticle } from "@/lib/api/articles-server";`
- `6: import { articleSlug, parseArticle } from "@/lib/api/articles";`
### auth_ownership
- `11: export default async function ArticlePage({params}:Props){const {locale,slug}=await params;if(!isLocale(locale)||!articleSlug(slug))notFound();setRequestLocale(locale);const t=await getTranslations("Articles");const response=await getPublic`
### state_transitions
- `8: import { RetryButton } from "@/components-next/retry-button";`
- `11: export default async function ArticlePage({params}:Props){const {locale,slug}=await params;if(!isLocale(locale)||!articleSlug(slug))notFound();setRequestLocale(locale);const t=await getTranslations("Articles");const response=await getPublic`
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- `8: import { RetryButton } from "@/components-next/retry-button";`
- `11: export default async function ArticlePage({params}:Props){const {locale,slug}=await params;if(!isLocale(locale)||!articleSlug(slug))notFound();setRequestLocale(locale);const t=await getTranslations("Articles");const response=await getPublic`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
