# Phase 0D semantic evidence

- **Surface:** Patient Mobile
- **Archive:** `nabd_plus_patient_app.zip`
- **Member path:** `src/core/data/Repository.ts`
- **Member SHA-256:** `bc2d65d04648050f34bdd976f924d5b159658964b3668f90a23e8da4711fc9c2`
- **Line count:** 225
- **Read range:** `1-225`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `4: * Screens/ViewModels talk ONLY to the Repository — never to raw APIs.`
- `7: *   Screen → Repository → [RemoteDataSource | LocalDataSource]`
- `53: page: number;`
- `54: pageSize: number;`
- `64: page: number;`
- `65: pageSize: number;`
- `66: totalPages: number;`
- `131: page: 1,`
- `132: pageSize: cached.length,`
- `133: totalPages: 1,`
- `194: page?: number;`
- `196: totalPages?: number;`
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- No matching static signal found in this member.
### state_transitions
- `13: // Base result type — typed success/failure without throwing`
- `15: export type Result<T, E = Error> =`
- `17: | { ok: false; error: E };`
- `22: export function Err<E extends Error>(error: E): Result<never, E> {`
- `23: return { ok: false, error };`
- `111: } catch (error) {`
- `112: return Err(error instanceof Error ? error : new Error(String(error)));`
- `123: } catch (error) {`
- `138: return Err(error instanceof Error ? error : new Error(String(error)));`
- `147: } catch (error) {`
- `148: return Err(error instanceof Error ? error : new Error(String(error)));`
- `157: } catch (error) {`
### payment_insurance_relevance
- `63: total: number;`
- `66: totalPages: number;`
- `130: total: cached.length,`
- `133: totalPages: 1,`
- `195: totalCount?: number;`
- `196: totalPages?: number;`
### error_empty_loading_retry_cancel
- `15: export type Result<T, E = Error> =`
- `17: | { ok: false; error: E };`
- `22: export function Err<E extends Error>(error: E): Result<never, E> {`
- `23: return { ok: false, error };`
- `111: } catch (error) {`
- `112: return Err(error instanceof Error ? error : new Error(String(error)));`
- `123: } catch (error) {`
- `138: return Err(error instanceof Error ? error : new Error(String(error)));`
- `147: } catch (error) {`
- `148: return Err(error instanceof Error ? error : new Error(String(error)));`
- `157: } catch (error) {`
- `158: return Err(error instanceof Error ? error : new Error(String(error)));`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
