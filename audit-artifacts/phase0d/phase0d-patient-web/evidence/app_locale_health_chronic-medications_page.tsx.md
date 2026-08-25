# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `app/[locale]/health/chronic-medications/page.tsx`
- **Member SHA-256:** `7a2714110230c55ef22e47ad2e5663033b7f2c7be310ea964b7e3cfa46ab74a9`
- **Line count:** 12
- **Read range:** `1-12`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `9: import { RetryButton } from "@/components-next/retry-button";`
- `12: export default async function ChronicMedicationsPage({params}:Props){const {locale}=await params;if(!isLocale(locale))notFound();setRequestLocale(locale);const t=await getTranslations("ChronicMedications");const token=await requirePatientAc`
### backend_consumers_or_contracts
- `5: import { getPatientChronicMedications } from "@/lib/api/chronic-meds-server";`
- `6: import { parseChronicMedications } from "@/lib/api/chronic-meds";`
- `7: import { requirePatientAccess } from "@/lib/auth/session";`
### auth_ownership
- `7: import { requirePatientAccess } from "@/lib/auth/session";`
- `12: export default async function ChronicMedicationsPage({params}:Props){const {locale}=await params;if(!isLocale(locale))notFound();setRequestLocale(locale);const t=await getTranslations("ChronicMedications");const token=await requirePatientAc`
### state_transitions
- `9: import { RetryButton } from "@/components-next/retry-button";`
- `12: export default async function ChronicMedicationsPage({params}:Props){const {locale}=await params;if(!isLocale(locale))notFound();setRequestLocale(locale);const t=await getTranslations("ChronicMedications");const token=await requirePatientAc`
### payment_insurance_relevance
- `12: export default async function ChronicMedicationsPage({params}:Props){const {locale}=await params;if(!isLocale(locale))notFound();setRequestLocale(locale);const t=await getTranslations("ChronicMedications");const token=await requirePatientAc`
### error_empty_loading_retry_cancel
- `9: import { RetryButton } from "@/components-next/retry-button";`
- `12: export default async function ChronicMedicationsPage({params}:Props){const {locale}=await params;if(!isLocale(locale))notFound();setRequestLocale(locale);const t=await getTranslations("ChronicMedications");const token=await requirePatientAc`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
