# Phase 0B semantic evidence — PharmacyInventoryExtService

**Archive member:** `src/modules/pharmacy/services/pharmacy-inventory-ext.service.ts`  
**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`  
**Read range:** lines 1–92 from the baseline archive extraction.

Lines 1–17 define provider-role assertion and inventory/low-stock alert repositories. Lines 19–32 implement provider-scoped inventory search by barcode or q across Arabic/English name, SKU, and generic name; results exclude Mongo internals, sort by Arabic name, and are limited to 50.

Lines 34–48 implement provider restock. Positive quantity is required; inventory update predicates on item ID and provider account, increments stock and records last restock, and auto-resolves open alerts when stock exceeds threshold. No visible idempotency/replay claim or stock audit ledger is present.

Lines 50–55 implement low-stock alert listing. Provider role is required; live alert refresh runs first; results are scoped to pharmacy account and open/acknowledged states. Lines 57–66 implement acknowledge with provider/item/status predicate and 404 when absent.

Lines 68–91 refresh open/acknowledged alerts by scanning provider inventory above zero thresholds, creating alerts when stock is at/below threshold, and updating current stock for existing alerts. Creation is not visibly unique/atomic against concurrent refresh calls.

**Auth/ownership:** exact provider role and provider account ID predicates for search/restock/alerts/acknowledge; internal refresh assumes caller scope.

**State transitions:** alert open → acknowledged/restocked; inventory stock increment and threshold-derived open alert creation/update.

**Price/payment/insurance source:** none visible.

**Security/truthfulness observations:** opaque search input is inserted into regex without visible escaping; restock is non-idempotent and has no audit trail visible; alert creation can duplicate under concurrent refresh without unique claim; low-stock current stock is updated but history is not retained; no DTO validation beyond quantity check.

**Test implications:** provider owner/stranger/unauth, regex injection/large input, restock replay/concurrency, inventory ownership, alert refresh deduplication, acknowledge replay, threshold boundaries, and stock auditability. No tests executed during this semantic read.

**Consumer traceability:** deferred to dedicated route-to-consumer phase.
