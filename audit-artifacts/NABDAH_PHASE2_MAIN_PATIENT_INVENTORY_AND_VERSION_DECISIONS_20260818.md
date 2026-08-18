
## Refined contract classification

The second controller pass reduced false positives in the 32-item review queue. The Chat controller is declared under both `chat` and `chats` and exposes `POST chat/threads/direct`, `POST chat/threads/booking`, `GET/POST chat/threads/:threadId/messages`; these Patient calls are therefore real prefix-compatible contracts, although membership, participant ownership, and booking authorization remain security checks. `GET medical/programs/active` is also a real Backend route under the extensions controller; the remaining mismatch there is the client's method on the active read path, not a missing feature.

The queue should therefore distinguish route-compiler omissions from genuine defects. Remaining likely defects include client calls that use collection POST instead of item-specific mutation routes (wishlist), POST where a read-only balance/catalog contract is GET (wallet and nutrition), direct pharmacy order calls that skip the explicit submit/transition contract, and family/profile mutations whose controller-specific prefixes must be checked against exact method and payload. These remain remediation candidates; no route is marked missing solely from the first compiler pass.


## Corrected 32-call classification using the actual route column

The first open-contract classifier used the wrong TSV field name and incorrectly labelled every item as no-route. After re-running against the actual `route` column, the queue is now separated correctly: many items are method mismatches against real GET/PATCH/POST contracts; chat routes require a controller-alias normalization pass; and only `patient/pay-copay` remains without an exact route in the current corpus and requires contract review. This correction supersedes the earlier all-no-route output and prevents false defect claims.
