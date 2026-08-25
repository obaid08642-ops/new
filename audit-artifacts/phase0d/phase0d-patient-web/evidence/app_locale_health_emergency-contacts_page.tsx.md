# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `app/[locale]/health/emergency-contacts/page.tsx`
- **Member SHA-256:** `24e166a5d90ab661194fd0ec71f3d313fb113434a2ea86687877ee201ce7fe1c`
- **Line count:** 12
- **Read range:** `1-12`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `9: import { RetryButton } from "@/components-next/retry-button";`
- `12: export default async function EmergencyContactsPage({params}:Props){const {locale}=await params;if(!isLocale(locale))notFound();setRequestLocale(locale);const t=await getTranslations("EmergencyContacts");const token=await requirePatientAcce`
### backend_consumers_or_contracts
- `5: import { getPatientEmergencyContacts } from "@/lib/api/emergency-contacts-server";`
- `6: import { parseEmergencyContacts } from "@/lib/api/emergency-contacts";`
- `7: import { requirePatientAccess } from "@/lib/auth/session";`
### auth_ownership
- `7: import { requirePatientAccess } from "@/lib/auth/session";`
- `12: export default async function EmergencyContactsPage({params}:Props){const {locale}=await params;if(!isLocale(locale))notFound();setRequestLocale(locale);const t=await getTranslations("EmergencyContacts");const token=await requirePatientAcce`
### state_transitions
- `9: import { RetryButton } from "@/components-next/retry-button";`
- `12: export default async function EmergencyContactsPage({params}:Props){const {locale}=await params;if(!isLocale(locale))notFound();setRequestLocale(locale);const t=await getTranslations("EmergencyContacts");const token=await requirePatientAcce`
### payment_insurance_relevance
- `12: export default async function EmergencyContactsPage({params}:Props){const {locale}=await params;if(!isLocale(locale))notFound();setRequestLocale(locale);const t=await getTranslations("EmergencyContacts");const token=await requirePatientAcce`
### error_empty_loading_retry_cancel
- `9: import { RetryButton } from "@/components-next/retry-button";`
- `12: export default async function EmergencyContactsPage({params}:Props){const {locale}=await params;if(!isLocale(locale))notFound();setRequestLocale(locale);const t=await getTranslations("EmergencyContacts");const token=await requirePatientAcce`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
