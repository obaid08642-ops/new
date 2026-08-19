# Phase 4 Admin Dashboard — command-center telemetry gaps

## Confirmed defects

| Priority | Finding | Evidence | Required remediation |
|---|---|---|---|
| **P0** | Heatmap invents locations for telemetry records without valid coordinates | Invalid/missing coordinates are rendered at deterministic synthetic panel locations (`[10 + …, 15 + …]`) while still labelled with region/category/count. This presents fabricated operational geography to privileged decision-makers. | Reject/quarantine invalid coordinate records, show a counted data-quality exception without a map point, and render only validated server-projected aggregates at approved precision. |
| **P1** | Command-centre outage can look like empty/unknown telemetry | Exceptions are logged to console then loading ends; health may remain null, live orders remain empty, and heatmap says no data. | Show explicit per-source unavailable/stale/retry state with timestamp and retain last verified snapshot only when clearly labelled. |
| **P1** | Dashboard exposes system-health/telemetry without visible data-classification and scope controls | It combines infrastructure health, live orders and geographic demand in one shell, but shows no authorized role/scope, retention/minimum-necessary, export or audit context. | Bind each feed to server-issued permission/scope and audit view access; minimize/order aggregate PHI/location and define support/operator roles. |
| **P1** | Dashboard is Arabic-first with fixed mappings and limited service/state coverage | Labels, state/kind maps, dates/direction and error states are hard-coded Arabic/RTL; unmapped values fall through raw. | Implement six-language dictionaries, exhaustive typed status translations and locale-aware table/date/currency formatting with RTL/LTR responsive testing. |

## Decision

The command centre is **FIX/BLOCKED** for trusted operational decision support until it no longer fabricates map placement or masks source outages and it applies explicit minimum-necessary access scope.
