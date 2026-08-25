# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `audit-artifacts/NABDAH_PHASE2_FAMILY_CHAT_MEMBERSHIP_CONTRACT_GAP_20260819.md`
- **Member SHA-256:** `956cea8f7b9e3b128488a893694e33a0639fd286b64953f4b211445a701aea92`
- **Line count:** 28
- **Read range:** `1-28`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `5: The authoritative Family module stores membership embedded in `FamilyGroup.members` and uses `findGroupByOwnerOrMember` for group-scoped routes. The compatibility Family Chat controller does not use that model/service. It instead reads a le`
- `24: The compatibility route derives message selection from a caller-derived key rather than accepting a client-supplied group ID, so the immediately observed path is not a direct cross-group identifier injection. The key is nevertheless derived`
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- `5: The authoritative Family module stores membership embedded in `FamilyGroup.members` and uses `findGroupByOwnerOrMember` for group-scoped routes. The compatibility Family Chat controller does not use that model/service. It instead reads a le`
- `17: | Current FamilyGroup members use chat | They can resolve to different `family_id` values based on their own user IDs instead of the actual group owner/group ID | **P0 FIX — messages are not reliably shared within the real family group** |`
- `19: | Group membership changes/removal | Chat authorization is disconnected from the current `FamilyGroup.members` source of truth | **P1 authorization FIX — resolve active group membership through FamilyService/repository and test removal/leav`
- `28: Family Chat remains **P0 FIX/BLOCKED** until it uses the authoritative current group membership model, rejects absent/removed membership, scopes messages to the resolved group identifier, and passes sandbox tests with owner, member, removed`
### state_transitions
- `3: ## Confirmed source mismatch`
- `18: | User has no current family group | Chat controller uses user ID as a synthetic family ID and permits read/write | **P1 integrity FIX — reject with no-group state instead of creating an implicit personal “family chat” namespace** |`
- `20: | Patient chat UI | UI presents group-chat semantics and polls `/family/chat/messages` | **FIX — show truthful no-group/error state and bind conversation identity to the authoritative group** |`
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- `20: | Patient chat UI | UI presents group-chat semantics and polls `/family/chat/messages` | **FIX — show truthful no-group/error state and bind conversation identity to the authoritative group** |`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
