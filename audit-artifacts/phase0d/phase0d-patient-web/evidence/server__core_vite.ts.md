# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `server/_core/vite.ts`
- **Member SHA-256:** `4bcc2f28e92497651d0c662b65943b73e777f1e38ab05363da3400e68d76f4a1`
- **Line count:** 67
- **Read range:** `1-67`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `41: const page = await vite.transformIndexHtml(url, template);`
- `42: res.status(200).set({ "Content-Type": "text/html" }).end(page);`
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- No matching static signal found in this member.
### state_transitions
- `42: res.status(200).set({ "Content-Type": "text/html" }).end(page);`
- `44: vite.ssrFixStacktrace(e as Error);`
- `56: console.error(`
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- `43: } catch (e) {`
- `44: vite.ssrFixStacktrace(e as Error);`
- `56: console.error(`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
