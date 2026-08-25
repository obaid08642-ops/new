# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `tests/articles-design.test.ts`
- **Member SHA-256:** `c70dfe0960e5d9e13d8ebcefe49ef6ad9de4fb894b67bf27ea086466dcfb5c32`
- **Line count:** 25
- **Read range:** `1-25`
- **Classification:** `OWNED_TEST`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `6: const page = readFileSync(resolve(process.cwd(), "app/[locale]/articles/page.tsx"), "utf8");`
- `17: expect(page).toContain('dir="auto"');`
- `19: expect(page).toContain('locale==="ar"||locale==="ur"?ChevronLeft:ChevronRight');`
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- No matching static signal found in this member.
### state_transitions
- `9: it("provides accessible search, category filters, and honest empty states", () => {`
- `12: expect(css).toContain(".empty, .state");`
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- `9: it("provides accessible search, category filters, and honest empty states", () => {`
- `12: expect(css).toContain(".empty, .state");`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
