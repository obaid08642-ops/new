# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `app/[locale]/health/vitals/page.tsx`
- **Member SHA-256:** `75f595cfd5166c91c4d570791945fde8d73857b7617b38f444cbce474cd1b312`
- **Line count:** 12
- **Read range:** `1-12`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `9: import { RetryButton } from "@/components-next/retry-button";`
- `12: export default async function VitalsPage({params}:Props){const {locale}=await params;if(!isLocale(locale))notFound();setRequestLocale(locale);const t=await getTranslations("Health");const token=await requirePatientAccess(locale);const respo`
### backend_consumers_or_contracts
- `5: import { extractVitalHistory } from "@/lib/api/vitals";`
- `6: import { getPatientVitalHistory } from "@/lib/api/vitals-server";`
- `7: import { requirePatientAccess } from "@/lib/auth/session";`
### auth_ownership
- `7: import { requirePatientAccess } from "@/lib/auth/session";`
- `12: export default async function VitalsPage({params}:Props){const {locale}=await params;if(!isLocale(locale))notFound();setRequestLocale(locale);const t=await getTranslations("Health");const token=await requirePatientAccess(locale);const respo`
### state_transitions
- `9: import { RetryButton } from "@/components-next/retry-button";`
- `12: export default async function VitalsPage({params}:Props){const {locale}=await params;if(!isLocale(locale))notFound();setRequestLocale(locale);const t=await getTranslations("Health");const token=await requirePatientAccess(locale);const respo`
### payment_insurance_relevance
- `12: export default async function VitalsPage({params}:Props){const {locale}=await params;if(!isLocale(locale))notFound();setRequestLocale(locale);const t=await getTranslations("Health");const token=await requirePatientAccess(locale);const respo`
### error_empty_loading_retry_cancel
- `9: import { RetryButton } from "@/components-next/retry-button";`
- `12: export default async function VitalsPage({params}:Props){const {locale}=await params;if(!isLocale(locale))notFound();setRequestLocale(locale);const t=await getTranslations("Health");const token=await requirePatientAccess(locale);const respo`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
