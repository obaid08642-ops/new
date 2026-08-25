# Phase 0B semantic evidence — PromotionCampaign schema

**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`

**Member read in full:** `src/schemas/promotion-campaign.schema.ts:1–44`

The schema uses collection `promotioncampaigns`, with a comment explaining that a prior collection name split admin writes from patient-home reads (`5–7`). PromotionCampaign stores generated unique id, indexed provider_id, Arabic/English titles, required original_price/discounted_price, start/end dates, optional image_url, enum status draft/pending/active/paused/completed and arbitrary target_parameters (`8–43`).

Provider ownership is only a required indexed string; no provider account/facility/tenant/active-status or authorization invariant is declared (`12–13`). Prices have no currency, non-negative/range, discount ordering, tax/fee, effective-price or immutable server-source validation (`21–25`). The schema does not prevent discounted_price >= original_price, invalid percentages or stale promotional price snapshots (`21–25`).

Start/end dates have no timezone, ordering, duration limits, publication window, recurrence or clock/source provenance (`27–31`). Status has no transition actor/reason, approval, activation prerequisites, expiry/completion automation, concurrency or CAS semantics (`36–37`). `target_parameters` is `any` Object with no auditable audience/eligibility allowlist, privacy classification, tenant scope, deterministic evaluation, abuse protection or versioning (`39–40`).

Image URL is a raw string with no secure storage/access/content/size/malware, signed URL, responsive/alt-text or retention controls (`33–34`). Titles are free text with no moderation, locale completeness, claim substantiation or SEO-visible-content consistency (`15–19`). No redemption/coupon/code, usage limits, per-user/provider limits, inventory/order linkage, attribution, refund/rollback or promotion-application idempotency is represented (`8–40`).

No audit actor, notification delivery, cache/search/index consistency, soft-delete/deletion/legal-hold or campaign analytics attribution state exists. No live campaign, target evaluation, price application, media or index runtime evidence is established by this source read. No code was changed and no build/test/application operation was performed during this read.
