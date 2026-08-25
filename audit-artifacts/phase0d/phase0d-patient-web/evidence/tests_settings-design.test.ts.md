# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `tests/settings-design.test.ts`
- **Member SHA-256:** `2b7eb2ef1d7fbe697330790ecd30472b9f7074e73900fab70656ad3a58240d4a`
- **Line count:** 25
- **Read range:** `1-25`
- **Classification:** `OWNED_TEST`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `6: const page = readFileSync(resolve(process.cwd(), "app/[locale]/settings/page.tsx"), "utf8");`
- `18: expect(page).toContain('dir="auto"');`
- `21: it("collapses safely for narrow screens", () => {`
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- `12: expect(css).toContain(".sessionsSummary");`
### state_transitions
- `9: it("provides structured settings cards, protected boundaries, and honest states", () => {`
- `13: expect(css).toContain(".state");`
### payment_insurance_relevance
- `9: it("provides structured settings cards, protected boundaries, and honest states", () => {`
### error_empty_loading_retry_cancel
- No matching static signal found in this member.

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
