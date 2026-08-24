# Phase 0B semantic evidence — providers.service.ts

**Archive member:** `src/modules/providers/providers.service.ts`  
**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`  
**Read ranges:** lines 2–160, 161–320 and 321–468; full 468-line member covered.

## Wiring and onboarding — lines 2–182

Lines 2–30 inject user/provider repositories, branch model, events and catalog publication. Lines 32–42 refresh the public projection with a generated idempotency key based on provider, reason and review timestamp.

Lines 44–90 create branch staff accounts after checking the admin user role and branch existence. Password defaults to `Temp123!` if omitted. The created staff user is active immediately; a doctor receives a provider profile with `ACTIVE`, `license_verified: true`, `approved_at`, and prices defaulting to 100. The code comment explicitly describes an institutional auto-approval bypass for doctors under a hospital umbrella. The service does not visibly verify the hospital license or perform a transaction across user/profile/branch writes.

Lines 92–133 implement self-application. They check phone uniqueness, hash the supplied password, create an inactive user and pending provider profile, emit registration and pending-review events, and return a public user plus full profile object. The profile response may include sensitive fields unless schema serialization removes them.

Lines 135–182 implement admin-assisted creation. Phone uniqueness is checked; absent passwords receive a `Temp@<random 0-9999>` password. `auto_approve` changes status directly to ACTIVE, enables the user, marks license verified and emits approved without a visible independent review or authorization check on `_admin` in this member. User and profile writes are non-transactional, and generated password is returned.

## Review and discovery — lines 184–348

Lines 184–236 implement approve/reject/suspend by provider ID. Each updates provider state and then user active state, emits an event and refreshes public projection. These cross-collection writes have no visible transaction/CAS, and state prerequisites/actor permission are delegated to callers. Approval sets `public_eligibility=true`, `medical_review_status=approved`, but explicitly sets `indexing_eligibility=false`.

Lines 238–255 provide pending/all lists and a public discovery filter requiring ACTIVE, public eligibility and approved medical review. Lines 257–310 implement public listing with type/city and insurance filters using regex/array matching, returning up to 200 records with `_id`/`__v` removed but no explicit PII field allowlist. Lines 311–336 implement map providers, selecting active/public/approved profiles with coordinates, excluding password hash, calculating Haversine distance and optional radius filtering; coordinate validation is incomplete and no pagination cursor is present.

Lines 338–348 distinguish unrestricted `getById` from filtered `getPublicById`. The unrestricted method returns any provider profile after only ID lookup and excludes only `_id`/`__v`, which may expose private fields to callers. Lines 349–363 implement `myProfile` using an OR across actor IDs and a restricted projection but do not resolve ambiguous identities.

## Profile, seed and configuration — lines 365–468

Lines 366–383 map provider types to user roles and remove password hash from public user output. Several provider types have no mapping, yielding undefined role. Lines 385–429 implement `seedDemoProviders`, inserting synthetic active/verified providers with system-seed users, fixed license patterns, random Riyadh-area coordinates, random ratings/review counts, broad capabilities, cash/insurance acceptance and working hours. Existence is checked only by name/type; no environment gate, explicit seeded marker, unique system namespace or transaction is visible. The function computes inserted/skipped arrays but does not return them in the shown member.

Lines 431–466 implement `updateProviderConfig` with an allow-list and governance reset if the provider was public/indexed/medically approved. It looks up and updates by provider ID, resets public/indexing/review fields when required and refreshes publication. No authenticated actor or owner check is visible in this method; callers must supply it. No CAS/version or transaction is visible.

## Confirmed findings

**Security/authorization:** branch staff creation permits default password and auto-approves doctors; admin creation can bypass review and returns generated password. `getById`, admin actions, `seedDemoProviders` and `updateProviderConfig` rely on callers for authorization. Unrestricted profile retrieval can expose PII. User/profile/branch and provider/user state updates are non-atomic.

**Truthfulness:** `seedDemoProviders` creates real DB records with synthetic names, license numbers, coordinates, ratings, reviews, capabilities and insurance acceptance. Those records can appear active/public if called. Demo seed is not live provider evidence. Approval/indexing flags intentionally diverge: approved is public-eligible but indexing is false.

**Contract/integrity:** broad `any`/dynamic data and regex filters lack explicit bounds/normalization. Public outputs are not visibly field-allowlisted. The generated-password path and fixed `Temp123!` fallback are credential risks. `Math.random` is used for password suffix and demo profile data.

**Test implications:** require institutional license verification and no auto-approval bypass without policy; transaction/CAS tests for multi-collection review; owner/stranger/unauth/admin/tenant matrix; secret/PII projection; public active/approved filters; demo-seed production gating and cleanup; role mapping exhaustiveness; query bounds/indexes; config reapproval and concurrent edits. No tests executed during this semantic read.
