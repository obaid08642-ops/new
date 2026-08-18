
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


## Final alias-aware review queue

After expanding the confirmed Controller aliases, the 32-call queue contains 9 alias-compatible Chat/copay calls, 20 method-mismatch candidates, and 10 no-exact-route review candidates (the header is excluded from these counts). The alias-compatible calls are not missing features; they still require semantic authorization/state checks. The remaining candidates are not all defects: some are legitimate UI mutations using an unsupported method, some need a different sub-route such as `/family/calendar/event` or `/users/me/wishlist/:itemId`, and some require a deliberate compatibility contract decision. This queue is now suitable for remediation planning and not for automatic source edits.


## Pharmacy basket contract review

`order-confirm.tsx` uses `GET /orders/:id` for detail and `POST /orders/:id/approve-basket` / `POST /orders/:id/reject-basket` for the two user actions. Both basket transition contracts are present in Backend main and the UI remains on the payment path only after the approval call succeeds. The earlier generic `POST /orders/:id` mismatch candidates in pharmacy chat/order-confirm are separate calls and require screen-intent review; they do not invalidate the basket confirmation flow.


## Parser corrections from screen-level reads

`family/calendar.tsx` correctly loads `GET /family/calendar` and creates events with `POST /family/calendar/event`; the earlier `POST /family/calendar` row is an extraction/method inference false positive. `nutrition/log-meal.tsx` correctly loads `GET /nutrition/foods` and saves the meal through `POST /nutrition/meals`; the earlier `POST /nutrition/foods` row is also a parser false positive. These items must be removed from the true remediation count after the extractor is corrected, not changed in source.


## Confirmed Patient UI gap: addresses

`profile/addresses.tsx` correctly loads addresses and updates the selected default address through `PATCH /users/me/addresses/:id`. However, the visible `Button` labelled `إضافة عنوان جديد` has no `onPress`, navigation, or mutation handler. This is a confirmed UI/UX defect: the screen advertises a core action that cannot be executed. It must be fixed in the remediation phase by adding a real create-address flow backed by `POST /users/me/addresses`, with validation, loading, error, cancellation, and refresh states. It is not safe to classify this as a route-parser mismatch.


## Unwired-button scan follow-up

A targeted scan of sensitive Patient screens found several apparent button candidates, but manual reads confirmed handlers for consultation follow-up, booking confirmation, medication barcode/AI scan, pharmacist chat expiry, and custom-item completion. These are not defects. The confirmed missing action remains the `إضافة عنوان جديد` button in `profile/addresses.tsx`; it has no handler and remains queued for remediation.
