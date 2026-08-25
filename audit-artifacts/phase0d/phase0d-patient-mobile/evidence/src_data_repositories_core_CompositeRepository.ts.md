# Phase 0D semantic evidence

- **Surface:** Patient Mobile
- **Archive:** `nabd_plus_patient_app.zip`
- **Member path:** `src/data/repositories/core/CompositeRepository.ts`
- **Member SHA-256:** `2a02668bec83d558950ed3f19c01fec76be34873c9f6dffd8e105c738fc4afe6`
- **Line count:** 74
- **Read range:** `1-74`
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
- `28: console.warn(`[CompositeRepository] Failed to fetch remote entity ${id}`, e);`
- `56: const success = await super.delete(id, soft, context);`
- `58: if (success) {`
- `62: return success;`
- `66: const success = await super.restore(id, context);`
- `68: if (success) {`
- `72: return success;`
### payment_insurance_relevance
- `42: EventBus.publish('entity.created', { entityType: this.tableName, payload: localResult });`
- `50: EventBus.publish('entity.updated', { entityType: this.tableName, id, payload: localResult });`
### error_empty_loading_retry_cancel
- `8: * CompositeRepository acts as the Offline-First coordinator.`
- `10: * It writes to the local database first, then queues for sync (Write-Through Cache / Offline Queue).`
- `27: } catch (e) {`
- `28: console.warn(`[CompositeRepository] Failed to fetch remote entity ${id}`, e);`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
