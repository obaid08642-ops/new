# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `app/[locale]/articles/page.tsx`
- **Member SHA-256:** `c079fdde4ec96f25eb5264fbdff7b2b665a466f9baf58be80048613d8da7b06e`
- **Line count:** 11
- **Read range:** `1-11`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `8: import { RetryButton } from "@/components-next/retry-button";`
- `11: export default async function ArticlesPage({params,searchParams}:Props){const {locale}=await params;if(!isLocale(locale))notFound();setRequestLocale(locale);const t=await getTranslations("Articles");const Chevron=locale==="ar"||locale==="ur`
### backend_consumers_or_contracts
- `5: import { getPublicArticleCategories, getPublicArticles } from "@/lib/api/articles-server";`
- `6: import { parseArticleCategories, parseArticleList } from "@/lib/api/articles";`
### auth_ownership
- `11: export default async function ArticlesPage({params,searchParams}:Props){const {locale}=await params;if(!isLocale(locale))notFound();setRequestLocale(locale);const t=await getTranslations("Articles");const Chevron=locale==="ar"||locale==="ur`
### state_transitions
- `8: import { RetryButton } from "@/components-next/retry-button";`
- `11: export default async function ArticlesPage({params,searchParams}:Props){const {locale}=await params;if(!isLocale(locale))notFound();setRequestLocale(locale);const t=await getTranslations("Articles");const Chevron=locale==="ar"||locale==="ur`
### payment_insurance_relevance
- `11: export default async function ArticlesPage({params,searchParams}:Props){const {locale}=await params;if(!isLocale(locale))notFound();setRequestLocale(locale);const t=await getTranslations("Articles");const Chevron=locale==="ar"||locale==="ur`
### error_empty_loading_retry_cancel
- `8: import { RetryButton } from "@/components-next/retry-button";`
- `11: export default async function ArticlesPage({params,searchParams}:Props){const {locale}=await params;if(!isLocale(locale))notFound();setRequestLocale(locale);const t=await getTranslations("Articles");const Chevron=locale==="ar"||locale==="ur`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
