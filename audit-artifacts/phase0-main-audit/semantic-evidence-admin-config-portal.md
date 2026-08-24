# Semantic evidence — Admin Config Portal

Baseline: `22526bedb77a3d8148219036367e4714f401aecc`.

`audit-work/source/web_admin_dashboard/src/pages/admin/config-portal.tsx:4–99` exposes two sensitive surfaces: global SLA configuration and emergency maintenance kill-switch. It reads `/api/v1/admin/config/sla` and writes it with `PUT`, validating consultation duration and call-ringing duration locally (`:18–64`). JWT expiry is editable but has no local range validation in `handleUpdateSLA`. Both read/write paths fall back to `http://localhost:8002` when `NEXT_PUBLIC_API_URL` is absent (`:21`, `:52`).

The emergency action writes `/api/v1/admin/governance/trigger-emergency-maintenance` with `PUT` and includes hard-coded `adminId: 'admin-master-001'` (`:66–99`). It requires two UI acknowledgements for activation but no re-authentication, two-person approval, idempotency key, server-issued confirmation nonce, or visible audit record is present in this page. The page states that the operation affects all live medical and commerce operations (`:167–199`), making this a high-risk control.

Error handling uses browser `alert` and console logging; there is no structured failure state or retry evidence. The page claims immediate global override and Redis core cache impact in copy, but the corresponding backend guard, audit trail, rollback semantics and authorization must be verified separately.

## Cross-layer verification required

1. Verify backend role/permission policy and audit logs for SLA and kill-switch.
2. Confirm whether idempotency, re-authentication, two-person approval and change reason are mandatory.
3. Verify server validation for all numeric settings including JWT expiry.
4. Prove maintenance rollback, blast radius, user communication and fail-safe behavior.
5. Remove/forbid localhost production fallback.
6. Confirm no hard-coded admin identity is trusted by backend.

No Phase 0 remediation was made.
