# Phase 0D semantic evidence

- **Surface:** Patient Mobile
- **Archive:** `nabd_plus_patient_app.zip`
- **Member path:** `src/data/database/drivers/SQLiteDriver.ts`
- **Member SHA-256:** `716f7d2cb03f454fc911c20da298b00e84a8fdf818c3e20023ef7227cd53fff3`
- **Line count:** 138
- **Read range:** `1-138`
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
- `9: * Detects an unrecoverable SQLite corruption error:`
- `15: private isCorruptionError(error: any): boolean {`
- `16: const msg = String(error?.message ?? error ?? '');`
- `17: const code = error?.code;`
- `21: /disk image is malformed|not a database|SQLitePrepareError|database is corrupt/i.test(msg)`
- `38: console.warn(`[SQLiteDriver] Failed to delete corrupt database "${this.dbName}"`, e);`
- `51: } catch (error) {`
- `52: if (this.isCorruptionError(error)) {`
- `55: throw error;`
- `60: async executeSql(sqlStatement: string, args: any[] = []): Promise<IDatabaseResult> {`
- `61: if (!this.db) throw new Error('Database not initialized');`
- `64: const isMutation = sqlStatement.trim().toUpperCase().startsWith('SELECT') === false;`
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- `9: * Detects an unrecoverable SQLite corruption error:`
- `15: private isCorruptionError(error: any): boolean {`
- `16: const msg = String(error?.message ?? error ?? '');`
- `17: const code = error?.code;`
- `21: /disk image is malformed|not a database|SQLitePrepareError|database is corrupt/i.test(msg)`
- `30: } catch {`
- `37: } catch (e) {`
- `38: console.warn(`[SQLiteDriver] Failed to delete corrupt database "${this.dbName}"`, e);`
- `51: } catch (error) {`
- `52: if (this.isCorruptionError(error)) {`
- `55: throw error;`
- `61: if (!this.db) throw new Error('Database not initialized');`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
