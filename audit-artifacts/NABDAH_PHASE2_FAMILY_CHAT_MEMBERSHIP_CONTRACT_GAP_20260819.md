# Phase 2 Patient — family chat membership and group-isolation gap

## Confirmed source mismatch

The authoritative Family module stores membership embedded in `FamilyGroup.members` and uses `findGroupByOwnerOrMember` for group-scoped routes. The compatibility Family Chat controller does not use that model/service. It instead reads a legacy Mongo collection named `familymembers`:

```ts
this.conn.collection('familymembers').findOne(...)
```

The current Backend source has no corresponding write/synchronization path for `familymembers`; the only source reference is this compatibility chat controller. When that lookup has no legacy row, `familyOf` falls back to the caller’s own user ID rather than rejecting absent membership.

## Impact

| Behavior | Result | Required disposition |
|---|---|---|
| Current FamilyGroup members use chat | They can resolve to different `family_id` values based on their own user IDs instead of the actual group owner/group ID | **P0 FIX — messages are not reliably shared within the real family group** |
| User has no current family group | Chat controller uses user ID as a synthetic family ID and permits read/write | **P1 integrity FIX — reject with no-group state instead of creating an implicit personal “family chat” namespace** |
| Group membership changes/removal | Chat authorization is disconnected from the current `FamilyGroup.members` source of truth | **P1 authorization FIX — resolve active group membership through FamilyService/repository and test removal/leave immediately revokes chat access** |
| Patient chat UI | UI presents group-chat semantics and polls `/family/chat/messages` | **FIX — show truthful no-group/error state and bind conversation identity to the authoritative group** |

## Positive control

The compatibility route derives message selection from a caller-derived key rather than accepting a client-supplied group ID, so the immediately observed path is not a direct cross-group identifier injection. The key is nevertheless derived from the wrong membership source and violates the actual group-sharing contract.

## Decision

Family Chat remains **P0 FIX/BLOCKED** until it uses the authoritative current group membership model, rejects absent/removed membership, scopes messages to the resolved group identifier, and passes sandbox tests with owner, member, removed member, and unrelated user accounts.
