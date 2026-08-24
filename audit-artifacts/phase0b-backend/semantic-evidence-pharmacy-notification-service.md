# Phase 0B semantic evidence — PharmacyNotificationService

**Archive member:** `src/modules/pharmacy/services/pharmacy-notification.service.ts`  
**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`  
**Read range:** lines 1–125 from the baseline archive extraction.

Lines 1–14 define notification service dependency and patient pharmacy order repository. Lines 16–25 notify patients when split completes, using localized title/body keys, order/split/status parameters, high-priority info type, and deep-link action.

Lines 28–38 notify a pharmacy of a new allocation with allocation/order/item-count parameters and deep link. Lines 40–66 notify the patient of item unavailability and allocation confirmation after resolving patient ownership through a minimal order projection.

Lines 68–94 notify patient allocation progress/cancellation with status/reason parameters and order deep-link actions. Lines 96–119 implement broadcast notifications to pharmacies and losing-pharmacy cancellation notices with broadcast/order/round/radius/item metadata.

Lines 121–124 resolve order ID to patient account ID through repository lookup and return only the needed identity projection.

**Auth/ownership:** notification recipient IDs come from persisted order/allocation objects; patient recipient is resolved from order ownership; service has no visible caller authorization because it is an internal side-effect service.

**State transitions:** notification methods mirror split, allocation, broadcast, unavailable, progress, cancellation events; no state mutation beyond notification creation.

**Price/payment/insurance source:** none visible.

**Security/truthfulness observations:** all notification creation failures are swallowed with `.catch(() => null)`, so operational success may be reported while notification delivery is absent; no deduplication/idempotency key is visible, so replayed workflow calls may duplicate notifications; message params include order/allocation/broadcast IDs and item names but no visible sensitive patient fields beyond recipient targeting.

**Test implications:** recipient isolation, localization key completeness, deep-link correctness, duplicate notification replay, failure observability, missing-order behavior, and broadcast loser cancellation. No tests executed during this semantic read.

**Consumer traceability:** deferred to dedicated route-to-consumer phase.
