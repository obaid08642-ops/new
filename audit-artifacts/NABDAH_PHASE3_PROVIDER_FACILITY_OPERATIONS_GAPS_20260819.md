# Phase 3 Provider — facility operations and staff-administration gaps

## Confirmed controls

Facility staff list/create/delete has been migrated to the protected `/hospital/staff` contract rather than the removed legacy subaccount route. This is a positive ownership-contract alignment that must be maintained during remediation.

## Confirmed defects

| Priority | Finding | Evidence | Required remediation |
|---|---|---|---|
| **P0** | Branch selection has no data scope effect | Selected branch only changes local chip styling; beds, surgeries, inbox, appointments, staff, and KPI requests omit the selected branch ID. A multi-branch hospital can view/mutate mixed operational data. | Require branch-aware, ownership-checked DTOs and explicit selected branch parameters; enforce permitted facility/branch scope server-side and test hospital-admin/staff/cross-branch cases. |
| **P0** | New staff credentials are generated with predictable client randomness and displayed as a password card | The client creates `TempPass#` plus four `Math.random` digits, POSTs it, and renders it for sharing. This lacks one-time invitation, secure generation, delivery, expiry, forced reset, role approval, or auditable acceptance. | Replace with server-generated, single-use, expiring invitation/reset tokens and approved delivery; never generate or display reusable staff passwords in the client. |
| **P1** | Facility identity and order activity can be fabricated or incomplete | Header hard-codes “Nabdah Medical Hospital”; pending order uses generic patient/amount fallbacks, active tab always shows no appointments, and fetch failures are silent. | Load authenticated facility/branch identity and server-authoritative operational lists; distinguish loading, error, empty and partial states without placeholder PHI or totals. |
| **P1** | Staff creation sends generic defaults rather than governed role policy | Client sends default department `General` and `['read','write']`, while permissions/role/specialty/license should be determined by approved facility policy and validated on Backend. | Use server-defined role templates, credential requirements and least-privilege permission grants; do not make unvalidated privilege choices in a generic staff form. |
| **P1** | QR check-in and SOS dispatch are visible despite fail-closed governance | Facility navigation exposes QR check-in and SOS dispatch flows while their consent/credential/location contracts remain unapproved. | Disable/remove the production actions with an approved explanatory state until the separate QR/emergency contracts are legally and product approved. |
| **P1** | Facility command UI remains Arabic/English-only and includes static notification signal | Branch, beds, staff, clinical order and financial screens lack six-language coverage; notification dot has no acknowledged count/state. | Complete accessible six-language RTL/LTR design, server-driven counts, and minimal-PHI display review. |

## Decision

Facility provider operations are **FIX/BLOCKED**. Staff-route alignment is retained, but branch scope and staff bootstrap security are release-critical and QR/emergency flows must remain fail-closed.
