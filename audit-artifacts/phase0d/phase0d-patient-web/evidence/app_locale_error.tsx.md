# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `app/[locale]/error.tsx`
- **Member SHA-256:** `d6c82a56d9a56e932d9cbd83cd5a0e3255195c0db5fbda4c8117976e168535e4`
- **Line count:** 10
- **Read range:** `1-10`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `7: const t = useTranslations("RouteState");`
- `9: return <main className="main auth-wrap"><section className="auth-card" role="alert" aria-live="assertive"><div className="eyebrow">{t("errorCode")}</div><h1>{t("errorTitle")}</h1><p>{t("errorBody")}</p><div className="route-state-actions"><`
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- `9: return <main className="main auth-wrap"><section className="auth-card" role="alert" aria-live="assertive"><div className="eyebrow">{t("errorCode")}</div><h1>{t("errorTitle")}</h1><p>{t("errorBody")}</p><div className="route-state-actions"><`
### state_transitions
- `5: export default function LocaleError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {`
- `7: const t = useTranslations("RouteState");`
- `9: return <main className="main auth-wrap"><section className="auth-card" role="alert" aria-live="assertive"><div className="eyebrow">{t("errorCode")}</div><h1>{t("errorTitle")}</h1><p>{t("errorBody")}</p><div className="route-state-actions"><`
### payment_insurance_relevance
- `9: return <main className="main auth-wrap"><section className="auth-card" role="alert" aria-live="assertive"><div className="eyebrow">{t("errorCode")}</div><h1>{t("errorTitle")}</h1><p>{t("errorBody")}</p><div className="route-state-actions"><`
### error_empty_loading_retry_cancel
- `5: export default function LocaleError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {`
- `9: return <main className="main auth-wrap"><section className="auth-card" role="alert" aria-live="assertive"><div className="eyebrow">{t("errorCode")}</div><h1>{t("errorTitle")}</h1><p>{t("errorBody")}</p><div className="route-state-actions"><`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
