# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `app/[locale]/loading.tsx`
- **Member SHA-256:** `022237cf837a09b648bf3ce1afbbaa48414b078827cfa412a9a790135385852d`
- **Line count:** 8
- **Read range:** `1-8`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `6: const t = useTranslations("RouteState");`
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- `7: return <main className="main auth-wrap" aria-busy="true"><section className="auth-card" role="status" aria-live="polite"><div className="eyebrow">{t("loadingCode")}</div><h1>{t("loadingTitle")}</h1><p>{t("loadingBody")}</p><div className="s`
### state_transitions
- `5: export default function LocaleLoading() {`
- `6: const t = useTranslations("RouteState");`
- `7: return <main className="main auth-wrap" aria-busy="true"><section className="auth-card" role="status" aria-live="polite"><div className="eyebrow">{t("loadingCode")}</div><h1>{t("loadingTitle")}</h1><p>{t("loadingBody")}</p><div className="s`
### payment_insurance_relevance
- `7: return <main className="main auth-wrap" aria-busy="true"><section className="auth-card" role="status" aria-live="polite"><div className="eyebrow">{t("loadingCode")}</div><h1>{t("loadingTitle")}</h1><p>{t("loadingBody")}</p><div className="s`
### error_empty_loading_retry_cancel
- `5: export default function LocaleLoading() {`
- `7: return <main className="main auth-wrap" aria-busy="true"><section className="auth-card" role="status" aria-live="polite"><div className="eyebrow">{t("loadingCode")}</div><h1>{t("loadingTitle")}</h1><p>{t("loadingBody")}</p><div className="s`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
