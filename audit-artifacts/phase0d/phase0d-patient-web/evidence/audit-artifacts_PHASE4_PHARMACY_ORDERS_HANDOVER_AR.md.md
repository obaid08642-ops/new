# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `audit-artifacts/PHASE4_PHARMACY_ORDERS_HANDOVER_AR.md`
- **Member SHA-256:** `16fd2e6b28304e5f85e816e8914a8863903e160fd9b9135e840de81302019f42`
- **Line count:** 19
- **Read range:** `1-19`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `7: تم نقل Orders list إلى `GET /patient/pharmacy/orders` وOrder detail إلى `GET /patient/pharmacy/orders/{id}`، مع BFF allowlist وUUID validation. تم بناء Order tracking من `GET /orders/{id}/tracking` كـSSR read-only، وعرض status وpharmacy وde`
- `15: Cart add/update/remove/clear، order create/update/submit/cancel، checkout/payment، prescription upload/OCR/share/dispense، reorder، pharmacy chat/review، وdelivery actions. Backend ownership موجود في بعض services، لكن Cart/Pharmacy mutation`
- `19: `59bb668` patient pharmacy GET contracts، `cb41fe5` tracking route، `ccce2ff` cart read-only، `ed7a3fd` bounded tracking details، `4f58b89` checkout preview، `1413d70` prescription preview، `92f6dd2` mutation gate.`
### backend_consumers_or_contracts
- `1: # Phase 4 — Pharmacy/Orders Handover`
- `7: تم نقل Orders list إلى `GET /patient/pharmacy/orders` وOrder detail إلى `GET /patient/pharmacy/orders/{id}`، مع BFF allowlist وUUID validation. تم بناء Order tracking من `GET /orders/{id}/tracking` كـSSR read-only، وعرض status وpharmacy وde`
- `15: Cart add/update/remove/clear، order create/update/submit/cancel، checkout/payment، prescription upload/OCR/share/dispense، reorder، pharmacy chat/review، وdelivery actions. Backend ownership موجود في بعض services، لكن Cart/Pharmacy mutation`
### auth_ownership
- `11: في آخر gate: 59 test files passed و14 skipped، 107 tests passed و23 skipped. نجح truthful runtime gate على 182 production files، وTypeScript check، وNext production build، وgit diff check. Sandbox owner/stranger لم يُشغّل لأن متغيرات البيئة`
- `15: Cart add/update/remove/clear، order create/update/submit/cancel، checkout/payment، prescription upload/OCR/share/dispense، reorder، pharmacy chat/review، وdelivery actions. Backend ownership موجود في بعض services، لكن Cart/Pharmacy mutation`
### state_transitions
- `7: تم نقل Orders list إلى `GET /patient/pharmacy/orders` وOrder detail إلى `GET /patient/pharmacy/orders/{id}`، مع BFF allowlist وUUID validation. تم بناء Order tracking من `GET /orders/{id}/tracking` كـSSR read-only، وعرض status وpharmacy وde`
- `15: Cart add/update/remove/clear، order create/update/submit/cancel، checkout/payment، prescription upload/OCR/share/dispense، reorder، pharmacy chat/review، وdelivery actions. Backend ownership موجود في بعض services، لكن Cart/Pharmacy mutation`
### payment_insurance_relevance
- `7: تم نقل Orders list إلى `GET /patient/pharmacy/orders` وOrder detail إلى `GET /patient/pharmacy/orders/{id}`، مع BFF allowlist وUUID validation. تم بناء Order tracking من `GET /orders/{id}/tracking` كـSSR read-only، وعرض status وpharmacy وde`
- `15: Cart add/update/remove/clear، order create/update/submit/cancel، checkout/payment، prescription upload/OCR/share/dispense، reorder، pharmacy chat/review، وdelivery actions. Backend ownership موجود في بعض services، لكن Cart/Pharmacy mutation`
### error_empty_loading_retry_cancel
- `15: Cart add/update/remove/clear، order create/update/submit/cancel، checkout/payment، prescription upload/OCR/share/dispense، reorder، pharmacy chat/review، وdelivery actions. Backend ownership موجود في بعض services، لكن Cart/Pharmacy mutation`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
