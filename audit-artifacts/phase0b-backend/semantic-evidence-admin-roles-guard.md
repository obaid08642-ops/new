# Phase 0B semantic evidence — Admin roles guard

**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`

**Member read in full:** `src/modules/admin-web-core/guards/roles.guard.ts:2–42`

`RolesGuard` defines a local four-value `UserRole` enum and a `Roles` decorator that writes `roles` metadata directly to the handler (`roles.guard.ts:5–17`). `canActivate` obtains `request.user`, lowercases `user.role`, computes `getEffectiveRoles(user)`, and checks handler metadata against effective roles (`23–32`). If no roles metadata exists, it applies a defense-in-depth heuristic: any route path matching `/admin(/|$)` is limited to `admin` or `super_admin`; all other routes return true (`34–41`).

The guard reads only handler metadata, not visibly merged class/controller metadata. It derives route protection from `request.route.path || request.url`, which may be templated, rewritten or absent depending on adapter/middleware. It also has no visible requirement that a user exist for routes without `@Roles`, and permits every non-admin route regardless of authentication. Role vocabulary is local and may drift from the common enum/effective-role implementation.

No product code was changed and no tests/builds were executed during this semantic read.

## Findings candidates

The read supports: decorator metadata drift, path-based admin bypass, class-level role omission, authentication fail-open for non-admin routes, local role vocabulary drift and global guard registration uncertainty.
