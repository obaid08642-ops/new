# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `tests/care-detail-design.test.ts`
- **Member SHA-256:** `e06b8efe47f54d90ce1bf33f39b3fe77e6a60fd107dad2fba1f787538e508722`
- **Line count:** 20
- **Read range:** `1-20`
- **Classification:** `OWNED_TEST`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `6: const diagnosticCss = readFileSync(resolve(process.cwd(), "app/[locale]/diagnostics/[domain]/[bookingId]/diagnostic-detail.module.css"), "utf8");`
### backend_consumers_or_contracts
- `5: const appointmentCss = readFileSync(resolve(process.cwd(), "app/[locale]/appointments/[appointmentId]/appointment-detail.module.css"), "utf8");`
### auth_ownership
- No matching static signal found in this member.
### state_transitions
- `12: expect(css).toContain(".state");`
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- No matching static signal found in this member.

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
