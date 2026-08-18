
## Refined contract classification

The second controller pass reduced false positives in the 32-item review queue. The Chat controller is declared under both `chat` and `chats` and exposes `POST chat/threads/direct`, `POST chat/threads/booking`, `GET/POST chat/threads/:threadId/messages`; these Patient calls are therefore real prefix-compatible contracts, although membership, participant ownership, and booking authorization remain security checks. `GET medical/programs/active` is also a real Backend route under the extensions controller; the remaining mismatch there is the client's method on the active read path, not a missing feature.

The queue should therefore distinguish route-compiler omissions from genuine defects. Remaining likely defects include client calls that use collection POST instead of item-specific mutation routes (wishlist), POST where a read-only balance/catalog contract is GET (wallet and nutrition), direct pharmacy order calls that skip the explicit submit/transition contract, and family/profile mutations whose controller-specific prefixes must be checked against exact method and payload. These remain remediation candidates; no route is marked missing solely from the first compiler pass.


## Corrected 32-call classification using the actual route column

The first open-contract classifier used the wrong TSV field name and incorrectly labelled every item as no-route. After re-running against the actual `route` column, the queue is now separated correctly: many items are method mismatches against real GET/PATCH/POST contracts; chat routes require a controller-alias normalization pass; and only `patient/pay-copay` remains without an exact route in the current corpus and requires contract review. This correction supersedes the earlier all-no-route output and prevents false defect claims.


## Focused copay and alias review

The copay contract is not absent from Backend main: the exact route is `POST /insurance/patient/pay-copay` in `insurance-engine.module.ts`, while Patient currently calls `POST /patient/pay-copay`. This is a genuine client/backend prefix mismatch and remains a FIX candidate; it must be corrected only after confirming the payload, booking/insurance ownership, idempotency, and payment failure states.

The Chat controller has an alias declaration for both `chat` and `chats`, so Patient `/chat/...` and SocketContext `/chats/...` are contract-compatible after compiler alias normalization. `medical/programs/active` and `medical/programs/complete-session` are real routes under the extensions controller; the active read call uses the wrong client method and the completion call needs payload/state/ownership review rather than a missing-screen decision.


## Copay correction after reading the alias controller

The earlier note that `/patient/pay-copay` was a genuine prefix mismatch is superseded by the Backend source: `InsuranceAliasController` explicitly exposes `POST /patient/pay-copay` and delegates to `InsuranceFlowService.payCopay`. The Patient route is therefore present and intentionally supported. The remaining review is semantic rather than routing: confirm gateway intent ownership, idempotency/replay behavior, state transition safety, and the expected failure behavior when the payment gateway is unavailable. No route fix should be applied for this item.
