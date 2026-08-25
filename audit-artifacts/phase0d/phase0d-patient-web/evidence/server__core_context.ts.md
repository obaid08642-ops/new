# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `server/_core/context.ts`
- **Member SHA-256:** `a43ea9ca8624270a83857d61a7154f17c48bb2c19126d1ee037a37345f6bda86`
- **Line count:** 28
- **Read range:** `1-28`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- No matching static signal found in this member.
### backend_consumers_or_contracts
- `1: import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";`
- `5: export type TrpcContext = {`
- `13: ): Promise<TrpcContext> {`
### auth_ownership
- No matching static signal found in this member.
### state_transitions
- `18: } catch (error) {`
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- `18: } catch (error) {`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
