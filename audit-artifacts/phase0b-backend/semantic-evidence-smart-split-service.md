# Phase 0B semantic evidence — SmartSplitService

**Archive member:** `src/modules/pharmacy/services/smart-split.service.ts`  
**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`  
**Read ranges:** lines 2–240 and 242–407 from the baseline archive extraction; the second range closed the truncation boundary. Lines 409–412 were also inspected as the trailing patch/comment block.

Lines 2–43 define the Smart Split engine, repositories, geo engine, split limits (MAX_SPLITS=4), review timeout (12 minutes), and composite weights for coverage/full coverage/distance/price/reliability.

Lines 45–174 implement `runForOrder`. It loads an order, requires READY_FOR_SPLIT/ALLOCATING/PARTIALLY_ALLOCATED and non-empty items, marks allocation in progress, releases/deletes prior pending/rejected/expired allocations, discovers approved/available pharmacies, builds a coverage matrix, ranks candidates, runs greedy set cover, atomically reserves inventory per allocation item, creates pending-review allocations with SAR totals and dynamic preparation SLA, persists explainability snapshot and rounds, marks item match status, and transitions order to FULLY_ALLOCATED/PARTIALLY_ALLOCATED/MANUAL_REVIEW. More than four allocations escalates to manual review.

Lines 177–187 discover candidates from authoritative provider_accounts with provider_type pharmacy and approved status, join provider profiles, and require ACCEPTING_ORDERS/ONLINE availability. Lines 189–240 build coverage from available inventory and select exact SKU/name, generic, or substitute matches; stock <=0 is excluded, partial quantity is represented, and inventory price is carried into the coverage object.

Lines 243–299 score candidates. Market-average item prices, provider reliability snapshots, geo distance, coverage/full ratios, price fit, and weighted score are computed and candidates sorted descending. Missing geo receives neutral distance score. Candidate coverage map is attached as `_cov`.

Lines 301–367 implement greedy set cover, selecting up to MAX_SPLITS candidates by remaining coverage/fullness/score and emitting round explainability. Lines 370–375 define `runWithMatrix`, but it simply calls `runForOrder`; the trailing comments state a matrix-injection patch but no implementation appears in the read member. This is a material correctness risk because greedyCover relies on `_cov` attached by scoreCandidates, while the comment indicates an unfinished wiring concern.

Lines 377–406 implement atomic stock decrement by inventory ID/provider, stock release for available allocation items, and release/deletion of previous allocations. Release operations catch errors and continue; no transaction spans stock and allocation/order persistence.

**Auth/ownership:** service accepts order ID without visible patient/provider actor authorization; candidate selection uses approved provider accounts and availability; allocation ownership is persisted by pharmacy account ID.

**State transitions:** READY_FOR_SPLIT/ALLOCATING/PARTIALLY_ALLOCATED → allocation plan → FULLY_ALLOCATED/PARTIALLY_ALLOCATED/MANUAL_REVIEW; allocations pending review then advance through allocation service; prior allocations released/deleted conditionally.

**Price/payment/insurance source:** inventory prices and market-average scoring; allocation totals from offered unit prices; no payment/insurance logic visible.

**Security/truthfulness observations:** no visible caller ownership/idempotency boundary around runForOrder; stock reserve and order/allocation writes are not transactional; release errors are swallowed; review timeout is 12 minutes while other pharmacy workflows may use different timeouts; candidate scoring reliability defaults to zero; the `runWithMatrix`/trailing patch comments suggest incomplete or inconsistent matrix wiring and must be verified against runtime behavior.

**Test implications:** order actor authorization, concurrent run/replay, stock conservation, allocation cleanup, candidate approval/availability, exact/generic/substitute/partial matching, score determinism, geo/price/reliability weighting, MAX_SPLITS, uncovered items, matrix wiring, and failure recovery. No tests executed during this semantic read.

**Consumer traceability:** deferred to dedicated route-to-consumer phase.
