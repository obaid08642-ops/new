# Patient Mobile: Wearables/manual vitals entry — manual review

## Scope boundary

This read-only source review covers the single Wearables inventory route. It does not validate device integrations, device provenance, patient ownership, clinical range/escalation policy, atomic persistence, physician access, data freshness or backend authorization.

| Reviewed source | Scope |
|---|---|
| `app/wearables/hub.tsx` | Manual vital entry labelled as a wearables surface |

## Evidence-backed findings

| ID | Classification | Evidence | Finding | Required closure evidence |
|---|---|---|---|---|
| PM-WEAR-001 | `MISSING_CAPABILITY` | `wearables/hub.tsx:177–182` | The screen explicitly states that direct smartwatch/device measurement is unavailable; it is manual vital entry, not wearable integration. | Product scope/labeling alignment; device authorization, ingestion/provenance and reconciliation only if wearable integration is approved. |
| PM-WEAR-002 | `STATIC_MATCHED_PARTIAL` | `wearables/hub.tsx:26–101, 115–154` | Client validates local numerical ranges then posts each selected reading separately to `/health/vitals` with `source:"manual"`. Static review cannot establish clinical range policy, ownership, unit/timezone/source audit or physician visibility. | Server-authoritative vital schema/range/source/audit model; clinical escalation and owner/stranger tests. |
| PM-WEAR-003 | `CONFIRMED_DEFECT` | `wearables/hub.tsx:136–153, 220–241` | Multi-reading save performs serial independent mutations and shows one global success only if all resolve. On a mid-sequence failure, already-saved readings remain but the UI gives generic failure and does not reconcile/report partial persistence. | Batch/transaction or per-reading receipt/status model; idempotency/retry and partial-failure reconciliation UX/tests. |

## Conclusion

Wearables is a manual PHI-entry surface without device integration. Its multi-reading submission contains a confirmed partial-persistence visibility gap. Manual source review is complete only for `app/wearables/hub.tsx`.
