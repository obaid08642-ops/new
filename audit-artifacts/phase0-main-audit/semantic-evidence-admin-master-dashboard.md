# Semantic evidence — Admin Master Dashboard

Baseline: `22526bedb77a3d8148219036367e4714f401aecc`.

`audit-work/source/web_admin_dashboard/src/pages/admin/dashboard.tsx:21–103` polls system liveness/readiness, heatmap telemetry and command-center live bookings every 30 seconds through `fetchWithAdminGuard`. It maps health responses into database/redis/container status and renders loading/empty/error-like states. The polling implementation is deterministic client polling, not a realtime socket despite the empty message referring to Socket (`:208–212`).

Heatmap mapping accepts real coordinates when they fall inside a Saudi bounding box; invalid/missing coordinates are replaced with deterministic synthetic screen positions based on array index (`:66–81`). This may be a visualization fallback rather than business data, but it must not be presented as real geography without an explicit label. The UI includes live demand clusters and an interactive modal with region, demand type and count (`:199–243`).

Live order rows link to `/admin/order-detail?kind=...&id=...` (`:155–197`), and values/status are formatted through local maps and numeric coercion. The screen does not show a visible retry control for failed fetches; errors are logged and loading ends (`:92–96`). `NEXT_PUBLIC_API_URL` falls back to `http://localhost:8002` (`:31`), requiring production environment verification.

## Cross-layer verification required

1. Map all three backend admin endpoints to controller/role guards and response schemas.
2. Verify admin audit logging, least privilege, tenant separation and PHI minimization for command-center data.
3. Distinguish real versus visual fallback heatmap coordinates.
4. Verify polling load, stale data indicator, retry and failure visibility.
5. Trace order-detail role/ownership and sensitive field exposure.
6. Verify production API base cannot silently fall back to localhost.

No Phase 0 remediation was made.
