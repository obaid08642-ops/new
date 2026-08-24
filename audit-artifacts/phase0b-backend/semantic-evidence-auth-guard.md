# Phase 0B semantic evidence — auth.guard.ts

**Archive member:** `src/common/auth.guard.ts`  
**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`  
**Read range:** lines 1–192 from the baseline archive extraction.

Lines 1–15 define `Public` and `Roles` metadata plus imports for permissions and ownership metadata. Lines 16–44 normalize provider-role aliases and derive effective roles from `role`, `provider_type`, and `providerType`.

Lines 46–87 implement `JwtAuthGuard`. It checks `Public` metadata, records trusted `req.ip`/socket address and user-agent in auditInfo, extracts Bearer token first, then falls back to the HttpOnly `nabd_admin_token` cookie. Missing token is accepted only for public routes. Production requires `JWT_SECRET`; token verification failure is 401 for protected routes but is accepted for public routes.

Lines 89–104 attach the JWT payload to `req.user` and enforce provider approval: provider-scope tokens require a matching provider account; unapproved accounts may access only exact onboarding paths and are forbidden elsewhere.

Lines 106–119 reject header-based impersonation and apply normalized role metadata. Lines 121–133 merge role-derived permissions with payload permissions and require all declared permissions.

Lines 135–169 implement optional ownership isolation metadata. For non-admin/super-admin payloads, resource ID is read from params/query/body, model lookup is by string `id`, owner/provider fields are compared to payload/facility IDs, missing resources return 404, and non-owner resources return 403. ObjectId fallback is commented but the implemented query shown is `{id: resourceId}`.

Lines 171–179 return success and define `CurrentUser`. Lines 181–192 define `NoGuestsGuard`, blocking `is_guest` or role `guest` from member-only areas.

**Auth/ownership:** bearer plus HttpOnly cookie; production secret requirement; provider approval gate; role/permission metadata; optional model ownership isolation; guest block.

**State transitions:** token extraction/verification → provider approval/role/permission/ownership checks → request user; no session issuance here.

**Price/payment/insurance source:** none visible.

**Security/truthfulness observations:** public-route token verification failures are intentionally accepted; Redis/session behavior is outside guard; ownership check returns 403 for foreign resources while missing resources return 404; model lookup only visibly uses `id` despite ObjectId comment; raw JWT payload is trusted for effective role/permissions after signature verification; cookie name is admin-specific even though guard is shared.

**Test implications:** public/protected auth, missing/invalid token, JWT_SECRET production fail-closed, cookie/header precedence, provider pending onboarding paths, impersonation rejection, role aliasing, permission union, ownership 404/403, facility provider ownership, NoGuests behavior, and IP attribution. No tests executed during this semantic read.

**Consumer traceability:** deferred to dedicated route-to-consumer phase.
