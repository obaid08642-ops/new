# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `app/[locale]/health/chronic-diseases/page.tsx`
- **Member SHA-256:** `a21440787cee24f1ad27cf1adc8d426774d9822443726d7b10bfde0a50270a18`
- **Line count:** 12
- **Read range:** `1-12`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `9: import { RetryButton } from "@/components-next/retry-button";`
- `12: export default async function ChronicDiseasesPage({params}:Props){const {locale}=await params;if(!isLocale(locale))notFound();setRequestLocale(locale);const t=await getTranslations("ChronicDiseases");const token=await requirePatientAccess(l`
### backend_consumers_or_contracts
- `5: import { getPatientChronicDiseases } from "@/lib/api/chronic-server";`
- `6: import { parseChronicDiseases } from "@/lib/api/chronic";`
- `7: import { requirePatientAccess } from "@/lib/auth/session";`
### auth_ownership
- `7: import { requirePatientAccess } from "@/lib/auth/session";`
- `12: export default async function ChronicDiseasesPage({params}:Props){const {locale}=await params;if(!isLocale(locale))notFound();setRequestLocale(locale);const t=await getTranslations("ChronicDiseases");const token=await requirePatientAccess(l`
### state_transitions
- `9: import { RetryButton } from "@/components-next/retry-button";`
- `12: export default async function ChronicDiseasesPage({params}:Props){const {locale}=await params;if(!isLocale(locale))notFound();setRequestLocale(locale);const t=await getTranslations("ChronicDiseases");const token=await requirePatientAccess(l`
### payment_insurance_relevance
- `12: export default async function ChronicDiseasesPage({params}:Props){const {locale}=await params;if(!isLocale(locale))notFound();setRequestLocale(locale);const t=await getTranslations("ChronicDiseases");const token=await requirePatientAccess(l`
### error_empty_loading_retry_cancel
- `9: import { RetryButton } from "@/components-next/retry-button";`
- `12: export default async function ChronicDiseasesPage({params}:Props){const {locale}=await params;if(!isLocale(locale))notFound();setRequestLocale(locale);const t=await getTranslations("ChronicDiseases");const token=await requirePatientAccess(l`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
