# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `tests/premium-brand.test.ts`
- **Member SHA-256:** `607e159eec122cb6d48a22267cd7716a151e1dc3b92d6f2efe4a4eb3bbd5bf2f`
- **Line count:** 28
- **Read range:** `1-28`
- **Classification:** `OWNED_TEST`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `18: const page = readFileSync(resolve(process.cwd(), "app/[locale]/dashboard/page.tsx"), "utf8");`
- `19: expect(page).toContain('from "@/components-next/pulse-shield-mark"');`
- `20: expect(page).toContain("<PulseShieldMark decorative />");`
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- No matching static signal found in this member.
### state_transitions
- No matching static signal found in this member.
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- No matching static signal found in this member.

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
