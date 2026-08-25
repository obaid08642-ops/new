# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `app/[locale]/mental-health/meditation/page.tsx`
- **Member SHA-256:** `a6ac3b1c45e4021ec8eff4cf9553c9961570f2615da8c688a858cb876bd14327`
- **Line count:** 12
- **Read range:** `1-12`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `9: import { RetryButton } from "@/components-next/retry-button";`
- `12: export default async function MeditationHistoryPage({params}:Props){const {locale}=await params;if(!isLocale(locale))notFound();setRequestLocale(locale);const t=await getTranslations("MentalHealth");const token=await requirePatientAccess(lo`
### backend_consumers_or_contracts
- `5: import { parseMeditationHistory } from "@/lib/api/meditation";`
- `6: import { getPatientMeditationHistory } from "@/lib/api/meditation-server";`
- `7: import { requirePatientAccess } from "@/lib/auth/session";`
### auth_ownership
- `7: import { requirePatientAccess } from "@/lib/auth/session";`
- `12: export default async function MeditationHistoryPage({params}:Props){const {locale}=await params;if(!isLocale(locale))notFound();setRequestLocale(locale);const t=await getTranslations("MentalHealth");const token=await requirePatientAccess(lo`
### state_transitions
- `9: import { RetryButton } from "@/components-next/retry-button";`
- `12: export default async function MeditationHistoryPage({params}:Props){const {locale}=await params;if(!isLocale(locale))notFound();setRequestLocale(locale);const t=await getTranslations("MentalHealth");const token=await requirePatientAccess(lo`
### payment_insurance_relevance
- `12: export default async function MeditationHistoryPage({params}:Props){const {locale}=await params;if(!isLocale(locale))notFound();setRequestLocale(locale);const t=await getTranslations("MentalHealth");const token=await requirePatientAccess(lo`
### error_empty_loading_retry_cancel
- `9: import { RetryButton } from "@/components-next/retry-button";`
- `12: export default async function MeditationHistoryPage({params}:Props){const {locale}=await params;if(!isLocale(locale))notFound();setRequestLocale(locale);const t=await getTranslations("MentalHealth");const token=await requirePatientAccess(lo`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
