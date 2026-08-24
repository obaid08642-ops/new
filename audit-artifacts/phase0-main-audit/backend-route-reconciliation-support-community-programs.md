# Backend route reconciliation — Support, Community and Therapeutic Programs

Baseline: backend source aligned to `main @ 22526bedb77a3d8148219036367e4714f401aecc`. Audit-only; no behavior changes.

## Support

`nabdah-backend/src/modules/support/support.controller.ts:7–10` applies `JwtAuthGuard` to the entire `support` controller. The authenticated routes include `POST /support/requests`, `POST /support/tickets` (alias), `GET /support/requests/mine`, `GET /support/requests/:id`, `POST /support/requests/:id/reply`, `GET /support/tickets`, `GET /support/faqs`, `POST /support/feedback`, `GET /support/settings` and `PATCH /support/settings` (`:11–40`). The admin routes are role-decorated (`:18–20`).

This reconciles a concrete Mobile mismatch: Mobile Support Chat calls the chat/assistant surface, but the controller exposes request/ticket/reply primitives and does not show a thread/message/attachment/realtime contract. The ticket list endpoint exists (`:23–26`), while Mobile opens every ticket at generic `/support/chat` without passing the ticket ID. Both ticket creation and request creation accept `body: any` (`:11–16`), and feedback also accepts `body: any` (`:34–37`); no DTO, Idempotency-Key, attachment binding, PHI moderation, SLA/status transition or response schema is visible at the controller boundary.

## Community

`src/modules/community/community.controller.ts:9–12` places Community behind `JwtAuthGuard`, but handlers use `req.user?.id ?? 'guest'` (`:26–29,36–39,41–44,46–49,70–77`), creating a direct policy ambiguity: an authenticated guard and a guest fallback coexist. Routes are `GET/POST /community/posts`, `GET /community/posts/:id`, `POST /community/posts/:id/comment`, `PUT /community/posts/:id/vote`, `DELETE /community/posts/:id`, admin moderation routes and live-session routes (`:16–85`). List pagination/tag/category exists (`:16–23`), but Mobile evidence does not prove it passes or renders those contracts. Vote is `PUT`, not POST (`:41–44`), and no idempotency/version/duplicate policy appears at the controller boundary. Comment body is minimally typed but no length/PHI/moderation/rate-limit schema is visible (`:36–39`).

## Therapeutic Programs

`src/modules/nabd-extensions/nabd-extensions.controller.ts:95–109` exposes `POST /medical/programs/enroll`, `GET /medical/programs/active`, and `POST /medical/programs/complete-session`. Enroll accepts a union program type (`:95–99`) and active is bound to `CurrentUser().id` (`:101–104`). Complete-session validates only presence of `programType` and `sessionId` before calling the service (`:106–110`); no visible Idempotency-Key, state/version precondition, schedule/attendance validation, reward ledger response or clinical consent is present. This corroborates Mobile fallback/false attendance and unproven completion/reward lifecycle.

## Reconciliation disposition

The backend has real primitives for support, community and programs, but controller-level existence does not prove the Mobile journey. DTO validation, service ownership/authorization, global idempotency interceptor behavior, response schemas, event durability and owner/stranger/unauth/replay tests remain open. No Phase 0 remediation was made.
