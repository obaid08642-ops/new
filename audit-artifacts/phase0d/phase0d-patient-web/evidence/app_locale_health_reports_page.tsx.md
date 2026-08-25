# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `app/[locale]/health/reports/page.tsx`
- **Member SHA-256:** `58b3159bf40d8a1ebc1c7496bbe3ad243ad5464161c800051f0be69de19690ca`
- **Line count:** 10
- **Read range:** `1-10`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `10: export default async function HealthReportsPage({ params }: Props) { const { locale }=await params; if(!isLocale(locale))notFound(); setRequestLocale(locale); const t=await getTranslations("Health"); const token=await requirePatientAccess(l`
### backend_consumers_or_contracts
- `4: import { getPatientReports } from "@/lib/api/vitals-server";`
- `5: import { parseReports } from "@/lib/api/reports";`
- `6: import { requirePatientAccess } from "@/lib/auth/session";`
### auth_ownership
- `6: import { requirePatientAccess } from "@/lib/auth/session";`
- `10: export default async function HealthReportsPage({ params }: Props) { const { locale }=await params; if(!isLocale(locale))notFound(); setRequestLocale(locale); const t=await getTranslations("Health"); const token=await requirePatientAccess(l`
### state_transitions
- `10: export default async function HealthReportsPage({ params }: Props) { const { locale }=await params; if(!isLocale(locale))notFound(); setRequestLocale(locale); const t=await getTranslations("Health"); const token=await requirePatientAccess(l`
### payment_insurance_relevance
- `10: export default async function HealthReportsPage({ params }: Props) { const { locale }=await params; if(!isLocale(locale))notFound(); setRequestLocale(locale); const t=await getTranslations("Health"); const token=await requirePatientAccess(l`
### error_empty_loading_retry_cancel
- `10: export default async function HealthReportsPage({ params }: Props) { const { locale }=await params; if(!isLocale(locale))notFound(); setRequestLocale(locale); const t=await getTranslations("Health"); const token=await requirePatientAccess(l`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
