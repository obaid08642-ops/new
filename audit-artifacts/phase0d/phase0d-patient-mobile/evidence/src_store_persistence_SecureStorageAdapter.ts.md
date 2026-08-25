# Phase 0D semantic evidence

- **Surface:** Patient Mobile
- **Archive:** `nabd_plus_patient_app.zip`
- **Member path:** `src/store/persistence/SecureStorageAdapter.ts`
- **Member SHA-256:** `1e74418d1ce444a62b0be5dd066f48c2285226fe6deb3d6b76cbfcaf1485101e`
- **Line count:** 106
- **Read range:** `1-106`
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
- `14: export class SecureStorageUnavailableError extends Error {`
- `17: this.name = 'SecureStorageUnavailableError';`
- `37: throw new SecureStorageUnavailableError('secure_random_source_unavailable');`
- `50: * No predictable fallback is permitted for patient-state persistence.`
- `64: } catch (error) {`
- `65: if (error instanceof SecureStorageUnavailableError) throw error;`
- `66: throw new SecureStorageUnavailableError('secure_key_store_unavailable');`
- `90: } catch (error) {`
### payment_insurance_relevance
- `91: console.warn(`[SecureStorageAdapter] Discarding unavailable or undecryptable value for key: ${key}`);`
### error_empty_loading_retry_cancel
- `14: export class SecureStorageUnavailableError extends Error {`
- `17: this.name = 'SecureStorageUnavailableError';`
- `31: } catch {`
- `37: throw new SecureStorageUnavailableError('secure_random_source_unavailable');`
- `64: } catch (error) {`
- `65: if (error instanceof SecureStorageUnavailableError) throw error;`
- `66: throw new SecureStorageUnavailableError('secure_key_store_unavailable');`
- `86: await AsyncStorage.removeItem(key).catch(() => {});`
- `90: } catch (error) {`
- `92: await AsyncStorage.removeItem(key).catch(() => {});`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
