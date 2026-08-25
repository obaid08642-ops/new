# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `app/[locale]/not-found.test.tsx`
- **Member SHA-256:** `e06e848c619be0bd11dbe9e8a6b032ed90cae3488df32e1087143f33cdd08780`
- **Line count:** 34
- **Read range:** `1-34`
- **Classification:** `OWNED_TEST`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `9: : { title: "Page unavailable", body: "This route cannot be opened or you do not have permission to access it.", returnHome: "Return home" };`
- `24: expect(html).toContain('href="/ar"');`
- `30: expect(html).toContain("Page unavailable");`
- `32: expect(html).toContain('href="/en"');`
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- `9: : { title: "Page unavailable", body: "This route cannot be opened or you do not have permission to access it.", returnHome: "Return home" };`
### state_transitions
- `19: it("renders an Arabic recovery state with a locale-safe home link", async () => {`
- `27: it("renders an English recovery state with a locale-safe home link", async () => {`
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- No matching static signal found in this member.

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
