# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `app/[locale]/mental-health/crisis-contacts/page.tsx`
- **Member SHA-256:** `9a60a97c9f322528a9ef8ca43d3d53904d38a0ca31bfd5f7ca66ddc565b90bca`
- **Line count:** 12
- **Read range:** `1-12`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `9: import { RetryButton } from "@/components-next/retry-button";`
- `12: export default async function CrisisContactsPage({params}:Props){const {locale}=await params;if(!isLocale(locale))notFound();setRequestLocale(locale);const t=await getTranslations("MentalHealth");const token=await requirePatientAccess(local`
### backend_consumers_or_contracts
- `5: import { parseCrisisContacts } from "@/lib/api/crisis-contacts";`
- `6: import { getPatientCrisisContacts } from "@/lib/api/crisis-contacts-server";`
- `7: import { requirePatientAccess } from "@/lib/auth/session";`
### auth_ownership
- `7: import { requirePatientAccess } from "@/lib/auth/session";`
- `12: export default async function CrisisContactsPage({params}:Props){const {locale}=await params;if(!isLocale(locale))notFound();setRequestLocale(locale);const t=await getTranslations("MentalHealth");const token=await requirePatientAccess(local`
### state_transitions
- `9: import { RetryButton } from "@/components-next/retry-button";`
- `12: export default async function CrisisContactsPage({params}:Props){const {locale}=await params;if(!isLocale(locale))notFound();setRequestLocale(locale);const t=await getTranslations("MentalHealth");const token=await requirePatientAccess(local`
### payment_insurance_relevance
- `12: export default async function CrisisContactsPage({params}:Props){const {locale}=await params;if(!isLocale(locale))notFound();setRequestLocale(locale);const t=await getTranslations("MentalHealth");const token=await requirePatientAccess(local`
### error_empty_loading_retry_cancel
- `9: import { RetryButton } from "@/components-next/retry-button";`
- `12: export default async function CrisisContactsPage({params}:Props){const {locale}=await params;if(!isLocale(locale))notFound();setRequestLocale(locale);const t=await getTranslations("MentalHealth");const token=await requirePatientAccess(local`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
