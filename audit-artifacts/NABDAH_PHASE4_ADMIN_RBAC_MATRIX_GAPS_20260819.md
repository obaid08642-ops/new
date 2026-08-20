# Phase 4 Admin Dashboard — RBAC matrix gaps

## Confirmed alignment

For the roles it includes, the dashboard’s static permission list currently mirrors the corresponding Backend `Permission` enum and `ROLE_PERMISSIONS` assignments. It is a display-only matrix; no dynamic role editing is exposed.

## Confirmed defects

| Priority | Finding | Evidence | Required remediation |
|---|---|---|---|
| **P1** | Admin RBAC matrix omits five authoritative Backend roles | Backend defines `GUEST`, `NURSING`, `AMBULANCE`, `HOSPITAL_ADMIN`, `BRANCH_ADMIN`, and `RECEPTIONIST`; dashboard lists only 15 roles and omits all except it never shows `GUEST` by design. The UI headline therefore is not a complete policy view. | Serve a versioned, server-generated role/permission/scope matrix or generate the display from shared source; include all active roles and explain intentionally non-privileged guest access. |
| **P1** | Matrix is a hard-coded duplicate with no policy version, scope or enforcement evidence | Frontend mirrors role strings manually and cannot show policy version, effective date, tenant/branch constraints, endpoint coverage, exceptions or runtime last-synced status. | Expose a read-only, authorized policy endpoint with source version/hash, role/branch scope, permission definitions and enforcement/test coverage; add drift tests in CI. |
| **P1** | High-risk permissions are displayed without risk/approval context | `user.impersonate`, `data.export` and `data.backup` appear as ordinary matrix dots, with no step-up, reason, session time limit, logging or break-glass description. | Classify sensitive permissions, show required safeguards and audit trail; enforce step-up/approval/justification server-side and record every use. |
| **P1** | Matrix is Arabic-only and visual state is not text-accessible | Permission status uses colour/blank-circle presentation with Arabic labels only. | Add accessible labels/legend/table semantics and reviewed six-language/RTL-LTR coverage. |

## Decision

The RBAC page is an informative but incomplete static mirror. It is **FIX/BLOCKED** as an authoritative governance or audit interface until server-versioned scope and sensitive-permission safeguards are visible and testable.
