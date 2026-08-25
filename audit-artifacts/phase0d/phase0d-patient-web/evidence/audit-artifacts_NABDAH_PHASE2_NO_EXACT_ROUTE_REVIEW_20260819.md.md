# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `audit-artifacts/NABDAH_PHASE2_NO_EXACT_ROUTE_REVIEW_20260819.md`
- **Member SHA-256:** `4d63cde7df39002ce373b741ed239d435b91cbd114809ed3cfed09874e63ddc9`
- **Line count:** 26
- **Read range:** `1-26`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `1: # Phase 2 Patient — no-exact route review`
- `5: The final Patient contract table listed ten provisional `NO_EXACT_ROUTE_REVIEW` rows. This document rechecks those rows against the Backend `main=53ba7da` source and does not perform any production mutation or source edit.`
- `7: | # | Patient consumer | Route/method | Backend evidence | Result |`
- `12: | 4 | `pharmacy/chat-with-pharmacist.tsx:60` | `POST /chat/threads/booking` | Same controller exposes `POST threads/booking` under both base aliases | **PASS_ALIAS_MATCH** |`
- `15: | 7 | `pharmacy/chat-with-pharmacist.tsx:168` | `POST /chat/threads/:id/messages` | Same controller exposes the same message send contract; repeated consumer, not a missing route | **PASS_ALIAS_MATCH** |`
- `18: | 10 | `programs/active.tsx:72` | `POST /medical/programs/complete-session` | `NabdExtensionsController` exposes `POST medical/programs/complete-session` and requires `programType` plus `sessionId` | **PASS_EXACT_ROUTE** |`
- `22: The ten provisional no-exact rows contain **no confirmed missing Backend route**. Eight are valid Chat alias contracts, one is a real client method mismatch against an existing GET route, and one is an exact POST route whose payload and sta`
- `26: The Chat contract is in `backend/src/modules/chat/chat.module.ts`, where the controller decorator is `@Controller(['chat', 'chats'])` and the direct, booking, message GET, and message POST handlers are present. The medical-program contracts`
### backend_consumers_or_contracts
- `16: | 8 | `SocketContext.tsx:57` | `POST /chats/threads/:id/messages` | `@Controller(['chat', 'chats'])` explicitly supports the `chats` prefix | **PASS_ALIAS_MATCH** |`
### auth_ownership
- `18: | 10 | `programs/active.tsx:72` | `POST /medical/programs/complete-session` | `NabdExtensionsController` exposes `POST medical/programs/complete-session` and requires `programType` plus `sessionId` | **PASS_EXACT_ROUTE** |`
- `22: The ten provisional no-exact rows contain **no confirmed missing Backend route**. Eight are valid Chat alias contracts, one is a real client method mismatch against an existing GET route, and one is an exact POST route whose payload and sta`
- `26: The Chat contract is in `backend/src/modules/chat/chat.module.ts`, where the controller decorator is `@Controller(['chat', 'chats'])` and the direct, booking, message GET, and message POST handlers are present. The medical-program contracts`
### state_transitions
- `22: The ten provisional no-exact rows contain **no confirmed missing Backend route**. Eight are valid Chat alias contracts, one is a real client method mismatch against an existing GET route, and one is an exact POST route whose payload and sta`
### payment_insurance_relevance
- `17: | 9 | `programs/active.tsx:44` | `POST /medical/programs/active` | `NabdExtensionsController` exposes `GET /medical/programs/active`; the consumer method is wrong for the read path and requires semantic/payload review | **METHOD_MISMATCH** `
- `22: The ten provisional no-exact rows contain **no confirmed missing Backend route**. Eight are valid Chat alias contracts, one is a real client method mismatch against an existing GET route, and one is an exact POST route whose payload and sta`
### error_empty_loading_retry_cancel
- No matching static signal found in this member.

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
