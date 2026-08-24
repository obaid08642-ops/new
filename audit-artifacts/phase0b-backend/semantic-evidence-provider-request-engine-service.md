# Phase 0B semantic evidence — provider-request-engine.service.ts

**Archive member:** `src/modules/provider/services/provider-request-engine.service.ts`  
**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`  
**Read ranges:** lines 2–130 and 131–246; full 246-line member covered.

## Identity, listing and detail

Lines 20–23 define `assertProvider`, requiring a recognized provider role. Lines 25–36 construct the engine with request/audit repositories, notifications, scoring, event emitter, assignment strategy and operator repository. Lines 39–50 list requests scoped to `provider_account_id=user.id`, with status/type filters, capped limit 200 and offset. Lines 52–57 detail a request by public `id` and provider account ID, returning 404 if not found.

## State transitions

Lines 60–117 implement a private transition helper. It requires provider role, finds a request scoped to the current provider, checks `PROVIDER_REQUEST_TRANSITIONS`, appends timeline and provider action records with actor metadata, updates state timestamps/reasons, saves, audits, calls assignment hooks for accepted/rejected, invokes scoring, creates an in-app notification, and returns the object. Lines 119–133 expose accept/reject/start/complete/cancel wrappers with inline bodies. Assignment hook errors are caught and logged; scoring errors are swallowed. Notification failure is not visibly isolated from the transition response.

## Staff assignment

Lines 135–168 require a staff ID, load the request by ID without provider predicate, then derive the caller account and enforce ownership/parent-provider/admin conditions. It resolves an active operator belonging to the request provider, updates assigned staff and notes (notes capped at 1000), saves and audits before/after assignment. The initial request lookup before authorization may expose timing/behavior differences, and no state, capacity, schedule, idempotency or concurrent assignment guard is visible.

## Internal creation and broadcast

Lines 170–225 define `createInternal`, accepting provider account, request type, patient/payload, summaries, amount, priority, schedule and a seeded flag. It creates a pending request with `amount_total || 0`, embeds patient/payload, marks seeded, creates a system notification, then broadcasts to `provider_{account}` with patient name fallback `مريض`, service type, total and urgency. There is no visible authorization because the method is intended for internal callers; no caller/source validation, idempotency, transaction/outbox or financial ledger linkage is visible. Patient data and amount are broadcast to the provider room.

## Helpers and findings

Lines 227–246 map status to Arabic/English titles and request types to icon strings, with bell fallback. These are presentation mappings, not authorization or source-of-truth logic.

**Security/ownership:** normal list/detail/transition methods scope by provider ID and role. `assignStaff` enforces ownership after an unscoped request lookup, while `createInternal` trusts caller/module boundaries. Parent-provider/admin exceptions and provider account identity require integration verification.

**Mutation integrity:** transitions are read-modify-save without visible CAS/transaction/idempotency; concurrent accept/reject/start/cancel can race. Staff assignment likewise lacks CAS/idempotency. Hook and notification side effects are not an outbox transaction, so state/audit/notification/assignment can diverge.

**Truthfulness/financial:** `amount_total || 0` defaults missing amounts to zero and is broadcast as `total`; no currency, price authority, payment status or ledger appears. Patient fallback name `مريض` can conceal missing identity in dashboard data. Scoring and assignment failures are logged/swallowed, so success of the state mutation does not prove downstream completion.

**Event/privacy:** `chat.broadcast` carries patient name, request type, total and schedule; room authorization and retention are not visible. Notifications use request patient fields directly, potentially undefined. No dedupe/event ID/retry/dead-letter is visible.

**Test implications:** require role/owner/stranger/unauth tests, parent/admin matrix, exact 404 concealment, transition CAS/replay/concurrency, atomic audit/notification/hook behavior, staff roster and schedule checks, internal caller authorization, amount/currency/ledger validation, PII broadcast controls, and event retry/dedupe. No tests executed during this semantic read.
