# Phase 6 Security/Ownership/Privacy — public care discovery gaps

## Confirmed acceptable public scope

Public specialty, degree and provider/facility discovery can be appropriate when limited to approved published information. Doctor list and global search filter provider status to `ACTIVE`.

## Confirmed defects

| Priority | Finding | Evidence | Required remediation |
|---|---|---|---|
| **P0** | Public provider detail/slot endpoints do not require active/publicly approved provider status | `doctorById` and `doctorSlots` find by ID/type only. A guessed ID for pending/suspended/non-public doctor may disclose profile and availability. | Enforce active/public-published status on all public detail/slot/similar routes; use a separate public DTO and test pending/rejected/suspended IDs as not found. |
| **P0** | Public provider/facility methods return whole profile documents rather than minimum public DTOs | Detail, list, search and facility hydration largely use `_id/__v` exclusion only, so every schema field added later can become public (e.g., location, insurance contracts, internal notes/documents). | Create explicit allowlisted public DTO/projection per resource, redact KYC/contact/internal/pricing/operational fields, version it and add snapshot leak tests. |
| **P1** | Similar-doctor and facility detail queries can include inactive/unpublished records | Similar-doctor query lacks active status; `facilityById` lacks `is_active` filter though list filters active facilities. | Apply publication status consistently and define deliberate archival/visibility behavior. |
| **P1** | Unescaped regex search accepts user-controlled patterns | Search/list filters create `RegExp(q.trim(), 'i')` directly, allowing expensive or malformed regex patterns. | Escape user input or use indexed/text search with length/rate limits and safe fallback errors. |
| **P1** | Public discovery pagination total is not true total | `total` equals only returned page length, potentially misrepresenting result count/coverage. | Return a scoped server-calculated total/cursor and clear pagination metadata. |
| **P1** | Public location/schedule exposure lacks a declared precision and privacy policy | Exact profile coordinates can drive distance sort and public slots reveal availability, with no radius/precision/purpose/retention rule in contract. | Publish only approved coarse location/availability, apply consent/provider visibility settings and protect detailed operational schedule. |

## Decision

Public care discovery is **P0 FIX/BLOCKED** for privacy and approval integrity until it consistently enforces published status and explicit minimum-data public DTOs.
