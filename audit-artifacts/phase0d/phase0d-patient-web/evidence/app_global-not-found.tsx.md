# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `app/global-not-found.tsx`
- **Member SHA-256:** `bab61c181a056b6194789b7a1a66dd0dbfede14bedcb2812b50ce1464ac45834`
- **Line count:** 8
- **Read range:** `1-8`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `7: return <html lang={locale} dir={locale === "ar" ? "rtl" : "ltr"}><body><main className="main auth-wrap"><section className="auth-card"><div className="eyebrow">404</div><h1>{copy.title}</h1><p>{copy.body}</p><a className="button button-prim`
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- No matching static signal found in this member.
### state_transitions
- No matching static signal found in this member.
### payment_insurance_relevance
- `7: return <html lang={locale} dir={locale === "ar" ? "rtl" : "ltr"}><body><main className="main auth-wrap"><section className="auth-card"><div className="eyebrow">404</div><h1>{copy.title}</h1><p>{copy.body}</p><a className="button button-prim`
### error_empty_loading_retry_cancel
- No matching static signal found in this member.

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
