# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `app/[locale]/page.tsx`
- **Member SHA-256:** `7a97ff0734319af803e9640c64ff82caa8228bb0a376a94e496be25b919eaa82`
- **Line count:** 11
- **Read range:** `1-11`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `11: export default async function LandingPage({ params }: Props) { const { locale } = await params; if (!isLocale(locale)) return null; setRequestLocale(locale); const t = await getTranslations("Home"); const metadata = await getTranslations("M`
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- `11: export default async function LandingPage({ params }: Props) { const { locale } = await params; if (!isLocale(locale)) return null; setRequestLocale(locale); const t = await getTranslations("Home"); const metadata = await getTranslations("M`
### state_transitions
- No matching static signal found in this member.
### payment_insurance_relevance
- `10: export async function generateMetadata({ params }: Props): Promise<Metadata> { const { locale } = await params; if (!isLocale(locale)) return {}; const t = await getTranslations({ locale, namespace: "Metadata" }); const canonical = localize`
- `11: export default async function LandingPage({ params }: Props) { const { locale } = await params; if (!isLocale(locale)) return null; setRequestLocale(locale); const t = await getTranslations("Home"); const metadata = await getTranslations("M`
### error_empty_loading_retry_cancel
- No matching static signal found in this member.

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
