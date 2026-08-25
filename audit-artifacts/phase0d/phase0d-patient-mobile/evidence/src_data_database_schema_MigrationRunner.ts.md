# Phase 0D semantic evidence

- **Surface:** Patient Mobile
- **Archive:** `nabd_plus_patient_app.zip`
- **Member path:** `src/data/database/schema/MigrationRunner.ts`
- **Member SHA-256:** `6a3c29aed51b2ebe62bf4a86989286623caaa28b1c340f977fcbaaf2cf752ecd`
- **Line count:** 99
- **Read range:** `1-99`
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
- `63: } catch (error) {`
- `64: console.error('[MigrationRunner] Critical failure during migration execution', error);`
- `66: throw error;`
- `74: private async applyMigration(version: number, description: string, sqlStatements: string[]): Promise<void> {`
- `78: for (const sql of sqlStatements) {`
- `86: console.log(`[MigrationRunner] Migration v${version} applied successfully.`);`
### payment_insurance_relevance
- `95: // or restoring from a remote backup if the SQLite file is totally corrupted.`
### error_empty_loading_retry_cancel
- `63: } catch (error) {`
- `64: console.error('[MigrationRunner] Critical failure during migration execution', error);`
- `66: throw error;`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
