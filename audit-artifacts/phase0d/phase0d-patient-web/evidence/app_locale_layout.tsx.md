# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `app/[locale]/layout.tsx`
- **Member SHA-256:** `bc30470308c5a43c7e8c134080b2c8ec9718aed4d008438dfee0c11488408c2e`
- **Line count:** 15
- **Read range:** `1-15`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `15: export default async function LocaleLayout({ children, params }: Props) { const { locale } = await params; if (!isLocale(locale)) notFound(); const typedLocale = locale as Locale; setRequestLocale(typedLocale); const messages = await getMes`
### backend_consumers_or_contracts
- `11: import { authCookieNames } from "@/lib/auth/cookies";`
### auth_ownership
- `6: import { cookies } from "next/headers";`
- `8: import { SessionActions } from "@/components-next/session-actions";`
- `11: import { authCookieNames } from "@/lib/auth/cookies";`
- `15: export default async function LocaleLayout({ children, params }: Props) { const { locale } = await params; if (!isLocale(locale)) notFound(); const typedLocale = locale as Locale; setRequestLocale(typedLocale); const messages = await getMes`
### state_transitions
- No matching static signal found in this member.
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- No matching static signal found in this member.

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
