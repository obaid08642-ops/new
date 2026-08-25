# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `tests/notifications-design.test.ts`
- **Member SHA-256:** `f92c490e4f313bde1c6e3e550665e79e5bfcc9f79a6bb998a2951fbb3fcd261d`
- **Line count:** 20
- **Read range:** `1-20`
- **Classification:** `OWNED_TEST`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `6: const page = readFileSync(resolve(process.cwd(), "app/[locale]/notifications/page.tsx"), "utf8");`
- `10: expect(page).toContain('t("settings")');`
### backend_consumers_or_contracts
- `5: const css = readFileSync(resolve(process.cwd(), "app/[locale]/notifications/notifications.module.css"), "utf8");`
- `6: const page = readFileSync(resolve(process.cwd(), "app/[locale]/notifications/page.tsx"), "utf8");`
### auth_ownership
- No matching static signal found in this member.
### state_transitions
- `9: it("provides translated settings access, explicit states, and an accessible focus treatment", () => {`
- `12: expect(css).toContain(".state");`
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- No matching static signal found in this member.

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
