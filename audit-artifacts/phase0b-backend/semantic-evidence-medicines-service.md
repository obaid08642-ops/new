# Phase 0B semantic evidence — medicines.service.ts

**Archive member:** `src/modules/medicines/medicines.service.ts`  
**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`  
**Read coverage:** lines 1–1516, including targeted continuation lines 863–1001; all source lines covered.

## Domain and positive controls

The service injects MedicineRepository, EventEmitter2, RedisService, Mongo connection and CatalogPublicationService (lines 1–27). It has governed public catalog filtering requiring not deleted, public eligibility, indexing eligibility and approved medical review (96–104), locale/category validation and bounded catalog fragments (108–137), normalized Arabic/English search and synonym expansion (44–86), card projection to reduce payloads (284–306), and cache-backed trending/autocomplete/categories (235–249, 526–551, 617–645). Public detail uses governed lookup, alternative medicines and live inventory aggregation (666–745). Approval requires missing translation checks and resets/sets governance metadata before catalog publication (771–800). Editable fields are mass-assignment whitelisted (1201–1219).

## Search/catalog observations

Search query construction uses regex across multiple fields and synonym expansion (140–166); the direct field regexes for name/ingredient/manufacturer are not visibly bounded by a maximum query length in this service. Barcode lookup supports GS1 candidates and then falls back to fuzzy name/ingredient regex matching (554–615), which can turn a malformed textual barcode into a catalog match. `getById` returns any non-deleted medicine while `getPublicById` applies public governance (666–675); callers must not use the former for public exposure.

`details` records product views and increments usage asynchronously (682–688), reads alternatives/stock and lazily writes denormalized aggregate stock (689–701). These analytics and aggregate writes are fire-and-forget and can silently fail; concurrent detail calls can race on the denormalized projection. Price/old_price are treated as numeric JavaScript values and discount is derived locally (711–715), with no currency/precision/finite/nonnegative validation in this service.

## Manual/import/admin mutation observations

`createManualEntry` spreads arbitrary Partial<Medicine> into a create and marks it unverified (756–768); authorization and DTO bounds must be established by the controller/global guards. `update` spreads arbitrary Partial<Medicine> into `$set` (826–837), without the editable-field whitelist used by newer change-request/admin paths and without a version/CAS condition. It emits storage deletion for a replaced main image before the database update, so a later DB failure can leave the document pointing to a deleted object.

Bulk import parses arbitrary row values, converts price with `Number(... ) || 0`, accepts broad fields and upserts by `name_ar` (1117–1166). This avoids some duplicate names but does not establish canonical barcode/ingredient identity, currency/bounds or idempotency for the import batch; failure rows can contain raw input. `adminCreateCatalog` likewise coerces price to zero for invalid/falsy input and creates a hidden pending-review record (1389–1418).

## Shortage/image/change-request workflows

Provider shortage reports deduplicate only by a read-then-insert pending query (868–905), so concurrent submissions can duplicate; quantity/note are not bounded here. Admin approval updates medicine, marks the report approved, then supersedes other pending reports through independent writes (924–946); partial failure can leave report and badge state divergent. Reject/clear/set availability similarly use independent updates (948–979). Audit writes are fire-and-forget and swallow errors (989–1000), so sensitive decisions can succeed without a durable audit record.

Image suggestions resolve uploaded storage objects and deduplicate only by read-then-insert for non-guest reporters (1003–1054); generated IDs use timestamp plus Math.random and insertion/notification are separate. Approval updates medicine, emits old-image deletion, then updates suggestion status (1068–1093); failure between these operations can create an image/record/asset inconsistency. `approveChangeRequest` applies medicine mutations, creates new items or emits storage deletes, then marks the request approved in a separate write (1300–1344), with no conditional claim/version; concurrent admins can both apply a pending request. `rejectChangeRequest` similarly performs a separate pending check and update (1347–1357).

`adminSetDeleted` uses a source-state predicate on read/update (1421–1432), which is a positive guard against some stale transitions. However admin direct edit performs a read, update and image cleanup separately (1464–1513), and only some paths reset governance metadata. Image deletion is event-based and not transactionally coupled to the catalog update.

## Confirmed audit implications

The service contains meaningful governance and whitelist controls, but it also contains multiple read-then-write races, fail-open asynchronous side effects, unbounded/free-form mutation paths, client/raw input coercion and non-transactional asset/catalog/report transitions. No product code was changed and no tests were executed during this semantic read.
