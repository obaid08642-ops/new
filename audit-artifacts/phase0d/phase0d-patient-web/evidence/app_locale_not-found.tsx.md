# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `app/[locale]/not-found.tsx`
- **Member SHA-256:** `fb9e03f2b81a7e5530ab97607840d7e122ae1f2e0a35ff1d8ac98b0e1e23058e`
- **Line count:** 16
- **Read range:** `1-16`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `15: return <main className="main auth-wrap"><section className="auth-card" role="status"><div className="eyebrow">404</div><h1>{t("title")}</h1><p>{t("body")}</p><Link className="button button-primary" href={`/${locale}`}>{t("returnHome")}</Lin`
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- `15: return <main className="main auth-wrap"><section className="auth-card" role="status"><div className="eyebrow">404</div><h1>{t("title")}</h1><p>{t("body")}</p><Link className="button button-primary" href={`/${locale}`}>{t("returnHome")}</Lin`
### state_transitions
- `15: return <main className="main auth-wrap"><section className="auth-card" role="status"><div className="eyebrow">404</div><h1>{t("title")}</h1><p>{t("body")}</p><Link className="button button-primary" href={`/${locale}`}>{t("returnHome")}</Lin`
### payment_insurance_relevance
- `15: return <main className="main auth-wrap"><section className="auth-card" role="status"><div className="eyebrow">404</div><h1>{t("title")}</h1><p>{t("body")}</p><Link className="button button-primary" href={`/${locale}`}>{t("returnHome")}</Lin`
### error_empty_loading_retry_cancel
- No matching static signal found in this member.

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
