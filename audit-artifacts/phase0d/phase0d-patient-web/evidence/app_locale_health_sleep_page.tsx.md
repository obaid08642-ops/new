# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `app/[locale]/health/sleep/page.tsx`
- **Member SHA-256:** `d53db078acb3737adffa8d2660e32c8689dceed01603f472c989aa3fd967348a`
- **Line count:** 12
- **Read range:** `1-12`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `9: import { RetryButton } from "@/components-next/retry-button";`
- `12: export default async function SleepPage({params}:Props){const {locale}=await params;if(!isLocale(locale))notFound();setRequestLocale(locale);const t=await getTranslations("Sleep");const token=await requirePatientAccess(locale);let response:`
### backend_consumers_or_contracts
- `5: import { getPatientSleepReadings } from "@/lib/api/sleep-server";`
- `6: import { parseSleepReadings } from "@/lib/api/sleep";`
- `7: import { requirePatientAccess } from "@/lib/auth/session";`
### auth_ownership
- `7: import { requirePatientAccess } from "@/lib/auth/session";`
- `12: export default async function SleepPage({params}:Props){const {locale}=await params;if(!isLocale(locale))notFound();setRequestLocale(locale);const t=await getTranslations("Sleep");const token=await requirePatientAccess(locale);let response:`
### state_transitions
- `9: import { RetryButton } from "@/components-next/retry-button";`
- `12: export default async function SleepPage({params}:Props){const {locale}=await params;if(!isLocale(locale))notFound();setRequestLocale(locale);const t=await getTranslations("Sleep");const token=await requirePatientAccess(locale);let response:`
### payment_insurance_relevance
- `12: export default async function SleepPage({params}:Props){const {locale}=await params;if(!isLocale(locale))notFound();setRequestLocale(locale);const t=await getTranslations("Sleep");const token=await requirePatientAccess(locale);let response:`
### error_empty_loading_retry_cancel
- `9: import { RetryButton } from "@/components-next/retry-button";`
- `12: export default async function SleepPage({params}:Props){const {locale}=await params;if(!isLocale(locale))notFound();setRequestLocale(locale);const t=await getTranslations("Sleep");const token=await requirePatientAccess(locale);let response:`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
