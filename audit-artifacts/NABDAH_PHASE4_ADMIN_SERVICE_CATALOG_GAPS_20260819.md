# Phase 4 Admin Dashboard — service catalog management gaps

## Confirmed defects

| Priority | Finding | Evidence | Required remediation |
|---|---|---|
| **P0** | A generic one-step form can immediately alter patient-facing clinical services, price, result time and availability | Admin can create/edit/delete laboratory, package, radiology and nursing services with price, turnaround, active state, descriptions and category fields, while UI claims changes appear immediately to patients/providers. No clinical/service-operational review, effective date, capacity/slot dependency, evidence, dual approval or rollback is present. | Establish versioned service-catalog governance with clinical/operations/finance approval tiers, source evidence, effective date, availability/capacity dependencies, patient-impact review, audit and rollback. |
| **P1** | Delete is a browser-confirm destructive action with no impact analysis | The button sends DELETE after one confirm, without showing affected bookings, orders, insurance mappings, provider configurations, historical records, soft-delete/retirement policy or recovery. | Replace with a controlled retirement state machine and dependent-record impact preview; preserve historical truth and require approval/audit. |
| **P1** | Service images use arbitrary external URLs | Form accepts any `image_url` labelled Cloudinary, without upload validation, domain allowlist, content moderation, provenance or lifecycle control. | Use approved owned media storage/reference policy, source allowlist/content validation/moderation and audit. |
| **P1** | Numerical/free-text fields have no authoritative client guidance or workflow validation | Price, old price, popularity, turnaround, short code and descriptions are generic text/number fields; packages lack visible component/service dependency validation and clinical safety constraints. | Use typed server schemas and field-level validated/returned constraints; model package components, clinical preparation, modality, location and insurance impacts explicitly. |
| **P1** | Error styling and empty state can misrepresent operational result | The same green message styling is used for save/delete/load failure messages; load failures leave prior/empty data with no independent stale/retry state. | Render semantic success/error/stale/retry states and no-result only for verified empty query. |
| **P1** | Service catalog is Arabic/English-only and has no patient-impact localization review | Patient-facing descriptions and operational labels omit the six required locales and no locale/version translation governance is shown. | Deliver reviewed multilingual service descriptions and accessible RTL/LTR workflow before publication. |

## Decision

Service catalog administration is **P0 FIX/BLOCKED**. It must not directly publish price, medical-service, turnaround or availability changes until catalog governance and dependent operational validation are implemented.
