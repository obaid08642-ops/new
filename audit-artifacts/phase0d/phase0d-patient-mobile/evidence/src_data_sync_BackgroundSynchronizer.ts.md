# Phase 0D semantic evidence

- **Surface:** Patient Mobile
- **Archive:** `nabd_plus_patient_app.zip`
- **Member path:** `src/data/sync/BackgroundSynchronizer.ts`
- **Member SHA-256:** `6fc55fb775b42b713b43b2279f1c943b101ec157f6a15e29478fee0bafe8b583`
- **Line count:** 61
- **Read range:** `1-61`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `20: * Registers a background task with the OS to periodically wake up the app and flush the queue.`
- `22: async registerBackgroundFetch(): Promise<void> {`
- `28: console.log('[BackgroundSynchronizer] Registering OS background fetch task');`
- `30: // Register the background fetch task`
- `32: await BackgroundFetch.registerTaskAsync(SYNC_BACKGROUND_TASK, {`
- `37: console.log('[BackgroundSynchronizer] Background fetch registered successfully');`
- `39: console.error('[BackgroundSynchronizer] Failed to register background fetch', err);`
- `52: // Define the task out of the class so it can be registered at top level in app entry`
### backend_consumers_or_contracts
- `22: async registerBackgroundFetch(): Promise<void> {`
### auth_ownership
- `24: if (Constants.appOwnership === 'expo') {`
### state_transitions
- `37: console.log('[BackgroundSynchronizer] Background fetch registered successfully');`
- `39: console.error('[BackgroundSynchronizer] Failed to register background fetch', err);`
- `59: return BackgroundFetch.BackgroundFetchResult.Failed;`
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- `38: } catch (err) {`
- `39: console.error('[BackgroundSynchronizer] Failed to register background fetch', err);`
- `58: } catch (err) {`
- `59: return BackgroundFetch.BackgroundFetchResult.Failed;`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
