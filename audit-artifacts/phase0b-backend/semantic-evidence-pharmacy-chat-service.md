# Phase 0B semantic evidence — PharmacyChatService

**Archive member:** `src/modules/pharmacy/services/pharmacy-chat.service.ts`  
**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`  
**Read range:** lines 1–166 from the baseline archive extraction.

Lines 1–39 define pharmacy substitute-negotiation chat, blocked content patterns for phone numbers, Arabic digits, URLs, external messenger names, and email, plus repositories for threads/messages/orders/allocations and EventBus.

Lines 41–53 implement open-or-get thread. Order existence is checked; thread identity is order/item/pharmacy tuple; newly created threads store patient and pharmacy IDs and open status. No explicit actor authorization is visible in this helper, which is also called with system actor paths.

Lines 55–71 implement participant-scoped thread/message reads. Patients query by patient account ID, providers by pharmacy account ID; foreign role/participant access returns 403. Messages exclude blocked entries and are returned in creation order.

Lines 73–101 implement postMessage. Thread must exist and be open; only patient or associated pharmacy can post. Text is screened, and blocked text is persisted as `[BLOCKED]` with reason before a 400 is thrown. Unblocked text/image URI/substitute offer is persisted, thread timestamp updated, and substitute proposal event emitted. Image URI and structured offer validation are not visible.

Lines 103–133 implement patient substitute acceptance. Patient ownership and open thread are required; message must contain an offer. Matching allocation item is changed to SUBSTITUTE using offer SKU/name/notes/price, thread is closed/resolved accepted, system message is added, and event emitted. No visible inventory reservation, total recalculation, payment re-quote, or transaction spans allocation/thread/message.

Lines 135–156 implement patient reject/remove. Patient ownership/open thread required; thread closes with rejected or removed resolution. Removal deletes the order item and appends timeline; no visible allocation, price, payment, insurance, or downstream workflow reconciliation is performed. System message and event follow.

Lines 158–165 implement auto-close sweep. Orders delivered/completed/cancelled older than 12 hours are found and open threads archived as timeout. No visible admin authorization boundary or idempotency is present in this service method.

**Auth/ownership:** patient/provider participant predicates for reads/post; patient-only substitute decisions; helper/system calls bypass actor checks by design; sweep assumes upstream admin/scheduler boundary.

**State transitions:** open → closed accepted/rejected/removed; open → archived timeout; blocked messages are persisted but not exposed in reads.

**Price/payment/insurance source:** substitute offer price is client-provided and copied to allocation; no payment/insurance/requote logic visible; item removal has no visible total recalculation.

**Security/truthfulness observations:** strong textual external-contact filter but no image/OCR/structured-offer validation; foreign access returns 403; substitute acceptance is non-transactional and does not visibly reserve stock; removal can leave allocations/payment totals stale; event failures are swallowed; sweep lacks visible authorization.

**Test implications:** patient/provider participant isolation, blocked content patterns, image/offer validation, substitute replay/concurrency, inventory/price/payment reconciliation, item removal downstream effects, auto-close authorization, and 403/404 contract. No tests executed during this semantic read.

**Consumer traceability:** deferred to dedicated route-to-consumer phase.
