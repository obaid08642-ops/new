# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `tests/notification-settings-design.test.ts`
- **Member SHA-256:** `366d4be884acb3921b4557fe7a6d08895625793815625650a3e93664cbbf8a43`
- **Line count:** 19
- **Read range:** `1-19`
- **Classification:** `OWNED_TEST`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- No matching static signal found in this member.
### backend_consumers_or_contracts
- `5: const css = readFileSync(resolve(process.cwd(), "app/[locale]/notifications/settings/settings.module.css"), "utf8");`
### auth_ownership
- `15: it("uses shared visual tokens for card hierarchy", () => {`
### state_transitions
- `8: it("provides protected value states and a responsive preference layout", () => {`
- `11: expect(css).toContain(".state");`
### payment_insurance_relevance
- `15: it("uses shared visual tokens for card hierarchy", () => {`
### error_empty_loading_retry_cancel
- No matching static signal found in this member.

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
