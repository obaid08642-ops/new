# Phase 2 Patient — no-exact route review

## Scope

The final Patient contract table listed ten provisional `NO_EXACT_ROUTE_REVIEW` rows. This document rechecks those rows against the Backend `main=53ba7da` source and does not perform any production mutation or source edit.

| # | Patient consumer | Route/method | Backend evidence | Result |
|---:|---|---|---|---|
| 1 | `consultations/chat-with-doctor.tsx:51` | `POST /chat/threads/direct` | `ChatController` is declared under both `@Controller(['chat', 'chats'])` and exposes `POST threads/direct` with `other_user_id` | **PASS_ALIAS_MATCH** |
| 2 | `consultations/chat-with-doctor.tsx:58` | `GET /chat/threads/:id/messages` | Same controller exposes `GET threads/:threadId/messages` under `chat` and `chats` | **PASS_ALIAS_MATCH** |
| 3 | `consultations/chat-with-doctor.tsx:125` | `POST /chat/threads/:id/messages` | Same controller exposes `POST threads/:threadId/messages` under `chat` and `chats` | **PASS_ALIAS_MATCH** |
| 4 | `pharmacy/chat-with-pharmacist.tsx:60` | `POST /chat/threads/booking` | Same controller exposes `POST threads/booking` under both base aliases | **PASS_ALIAS_MATCH** |
| 5 | `pharmacy/chat-with-pharmacist.tsx:68` | `GET /chat/threads/:id/messages` | Same controller exposes the authenticated message read contract | **PASS_ALIAS_MATCH** |
| 6 | `pharmacy/chat-with-pharmacist.tsx:124` | `POST /chat/threads/:id/messages` | Same controller exposes the authenticated message send contract | **PASS_ALIAS_MATCH** |
| 7 | `pharmacy/chat-with-pharmacist.tsx:168` | `POST /chat/threads/:id/messages` | Same controller exposes the same message send contract; repeated consumer, not a missing route | **PASS_ALIAS_MATCH** |
| 8 | `SocketContext.tsx:57` | `POST /chats/threads/:id/messages` | `@Controller(['chat', 'chats'])` explicitly supports the `chats` prefix | **PASS_ALIAS_MATCH** |
| 9 | `programs/active.tsx:44` | `POST /medical/programs/active` | `NabdExtensionsController` exposes `GET /medical/programs/active`; the consumer method is wrong for the read path and requires semantic/payload review | **METHOD_MISMATCH** |
| 10 | `programs/active.tsx:72` | `POST /medical/programs/complete-session` | `NabdExtensionsController` exposes `POST medical/programs/complete-session` and requires `programType` plus `sessionId` | **PASS_EXACT_ROUTE** |

## Decision

The ten provisional no-exact rows contain **no confirmed missing Backend route**. Eight are valid Chat alias contracts, one is a real client method mismatch against an existing GET route, and one is an exact POST route whose payload and state transitions still require semantic testing. This correction reduces the open Patient route-absence count to zero; it does not close authorization, ownership, idempotency, medical-safety, or runtime build gates.

## Evidence

The Chat contract is in `backend/src/modules/chat/chat.module.ts`, where the controller decorator is `@Controller(['chat', 'chats'])` and the direct, booking, message GET, and message POST handlers are present. The medical-program contracts are in `backend/src/modules/nabd-extensions/nabd-extensions.controller.ts`: `GET medical/programs/active` and `POST medical/programs/complete-session`, with required `programType` and `sessionId` validation.
