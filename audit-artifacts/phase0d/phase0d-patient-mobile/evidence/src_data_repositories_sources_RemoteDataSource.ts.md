# Phase 0D semantic evidence

- **Surface:** Patient Mobile
- **Archive:** `nabd_plus_patient_app.zip`
- **Member path:** `src/data/repositories/sources/RemoteDataSource.ts`
- **Member SHA-256:** `bfea1d6923c909d20c39b34a7574a70a38cb4b3a76aa9abc639f711e8220777e`
- **Line count:** 65
- **Read range:** `1-65`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- No matching static signal found in this member.
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- No matching static signal found in this member.
### state_transitions
- `21: if (e.status === 404) return null;`
- `41: console.error(`[RemoteDataSource] fetchAll failed for ${this.endpoint}`, e);`
- `61: console.error(`[RemoteDataSource] delete failed for ${this.endpoint}/${id}`, e);`
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- `20: } catch (e: any) {`
- `40: } catch (e: any) {`
- `41: console.error(`[RemoteDataSource] fetchAll failed for ${this.endpoint}`, e);`
- `60: } catch (e: any) {`
- `61: console.error(`[RemoteDataSource] delete failed for ${this.endpoint}/${id}`, e);`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
