# Phase 0B semantic evidence — AdPlacement schema

**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`

**Member read in full:** `src/schemas/ad-placement.schema.ts:1–34`

The timestamped `ad_placements` schema defines unique ID, required indexed providerId, required bidAmount and dailyBudget numeric fields, targetedKeywords string array defaulting empty, runtime status enum `active|paused` defaulting active with index, and impressionsCount/clicksCount counters defaulting zero (`7–34`).

No advertiser/account ownership, tenant, campaign, creative, destination URL, category/health claim review, audience consent, frequency cap, start/end schedule, timezone, currency, tax, invoice or payment authorization is represented (`12–31`). bidAmount and dailyBudget are unconstrained numbers without nonnegative bounds, currency/precision, budget exhaustion or atomic spend semantics (`15–19`). targetedKeywords are unconstrained and lack taxonomy, locale, prohibited-health/medical claims, sensitive-attribute targeting, normalization or privacy controls (`21–22`). Status has no actor/time/reason/history, approval/moderation, expiry or terminal policy (`24–25`). Impressions/clicks are mutable counters with no event IDs, unique viewer/click deduplication, bot/fraud filtering, attribution or billing reconciliation (`27–31`). No ad disclosure/label, user opt-out, content safety, retention/deletion or access projection policy is represented. No code was changed and no build/test/application operation was performed during this read.
