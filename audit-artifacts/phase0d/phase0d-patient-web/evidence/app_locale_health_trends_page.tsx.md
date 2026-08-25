# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `app/[locale]/health/trends/page.tsx`
- **Member SHA-256:** `f87a2cd9d72a40f20c4a7d9625b7f17d846d8e96714a4791a905926b39dea698`
- **Line count:** 13
- **Read range:** `1-13`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `9: import { RetryButton } from "@/components-next/retry-button";`
- `13: export default async function HealthTrendsPage({params}:Props){const {locale}=await params;if(!isLocale(locale))notFound();setRequestLocale(locale);const t=await getTranslations("HealthTrends");const token=await requirePatientAccess(locale)`
### backend_consumers_or_contracts
- `5: import { getPatientHealthTrends } from "@/lib/api/trends-server";`
- `6: import { parseHealthTrends } from "@/lib/api/trends";`
- `7: import { requirePatientAccess } from "@/lib/auth/session";`
### auth_ownership
- `7: import { requirePatientAccess } from "@/lib/auth/session";`
- `13: export default async function HealthTrendsPage({params}:Props){const {locale}=await params;if(!isLocale(locale))notFound();setRequestLocale(locale);const t=await getTranslations("HealthTrends");const token=await requirePatientAccess(locale)`
### state_transitions
- `9: import { RetryButton } from "@/components-next/retry-button";`
- `13: export default async function HealthTrendsPage({params}:Props){const {locale}=await params;if(!isLocale(locale))notFound();setRequestLocale(locale);const t=await getTranslations("HealthTrends");const token=await requirePatientAccess(locale)`
### payment_insurance_relevance
- `13: export default async function HealthTrendsPage({params}:Props){const {locale}=await params;if(!isLocale(locale))notFound();setRequestLocale(locale);const t=await getTranslations("HealthTrends");const token=await requirePatientAccess(locale)`
### error_empty_loading_retry_cancel
- `9: import { RetryButton } from "@/components-next/retry-button";`
- `13: export default async function HealthTrendsPage({params}:Props){const {locale}=await params;if(!isLocale(locale))notFound();setRequestLocale(locale);const t=await getTranslations("HealthTrends");const token=await requirePatientAccess(locale)`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
