# Phase 0B semantic evidence — leave-requests.controller.ts

**Archive member:** `src/modules/provider/leave-requests.controller.ts`  
**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`  
**Read range:** lines 2–64; full 64-line member covered.

Lines 2–12 inject the LeaveRequest model and apply `JwtAuthGuard` at controller level. Lines 14–21 expose `GET /provider/leave-requests`; the current user is called `facility`, an unused request body parameter is present on a GET, and the query filters solely by `facility_id: facility.id`, sorts newest first and limits to 200.

**Read surface:** The endpoint has a hard limit but no pagination/cursor, date/status filter, projection, or visible role restriction. Correctness depends on `facility.id` being the intended facility scope and not merely a user ID. No explicit tenant or provider ownership validation is visible.

Lines 23–46 expose `POST /provider/leave-requests`. It accepts facility_id, type, dates, reason, provider_name and provider_type. It validates presence and parseability/order of dates (lines 28–33), then creates a pending record with `facility_id: body.facility_id || user.id`, `provider_account_id: user.id`, and client-supplied or user-derived provider metadata (lines 34–44). It returns the created object (line 45).

**Critical ownership/mass-assignment risk:** an authenticated caller can supply another `facility_id`; no check ties it to the current user or an authorized facility. `provider_name` and `provider_type` are accepted from the client, allowing stale or misleading identity metadata. No overlap detection, timezone/date normalization policy, reason length limit, status override protection beyond server default, or idempotency key is visible. The response returns the full created object, potentially exposing internal fields.

Lines 48–63 expose `POST /provider/leave-requests/action` for approve/reject. It validates ID and action enum, then performs one conditional `findOneAndUpdate` requiring `id`, `facility_id: facility.id`, and `status: 'pending'`, setting status, decided_by, decided_at and decision_note. Missing matches return 404; success returns id/status.

**State/authorization:** The conditional update is a useful single-document compare-and-set for pending status, but the controller does not visibly verify facility role, separation of duties, self-approval rules, action idempotency, decision-note requirements, or audit event. It uses `id` rather than `_id`, requiring schema/index verification. There is no transaction for side effects that may be needed after approval.

**Test implications:** owner/facility/stranger/unauth and role tests; body facility override; provider metadata spoofing; date/timezone/overlap validation; payload limits; response redaction; pagination; double decision/replay; self-approval/separation; invalid ID behavior; audit/notification side effects and index tests. No tests executed during this semantic read.
