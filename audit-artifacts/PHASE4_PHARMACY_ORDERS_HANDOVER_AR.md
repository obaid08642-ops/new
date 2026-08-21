# Phase 4 — Pharmacy/Orders Handover

أُغلقت أول Contract Pack تدريجيًا على الفرع التنفيذي دون فتح mutations غير مكتملة.

## ما تم إغلاقه

تم نقل Orders list إلى `GET /patient/pharmacy/orders` وOrder detail إلى `GET /patient/pharmacy/orders/{id}`، مع BFF allowlist وUUID validation. تم بناء Order tracking من `GET /orders/{id}/tracking` كـSSR read-only، وعرض status وpharmacy وdelivery mode وETA وtotal/currency عند توفرها من Backend فقط. تم بناء `/cart` من `GET /cart`، و`/cart/checkout` من GET preview، و`/cart/prescription` من `GET /cart/prescription`. كل parsers تستخدم field allowlisting ولا تعرض patient IDs أو addresses أو notes أو attachments أو raw payload.

## الاختبارات

في آخر gate: 59 test files passed و14 skipped، 107 tests passed و23 skipped. نجح truthful runtime gate على 182 production files، وTypeScript check، وNext production build، وgit diff check. Sandbox owner/stranger لم يُشغّل لأن متغيرات البيئة وحسابات Sandbox غير موجودة، ولذلك لم يتم الادعاء بأنه اختبار حي.

## ما بقي مؤجلًا

Cart add/update/remove/clear، order create/update/submit/cancel، checkout/payment، prescription upload/OCR/share/dispense، reorder، pharmacy chat/review، وdelivery actions. Backend ownership موجود في بعض services، لكن Cart/Pharmacy mutation controllers لا تثبت idempotency-key أو replay-safe contract للويب، وبعض operations تحتاج DTO/error/transition guarantees أكثر تحديدًا. ستبقى هذه المسارات محجوبة في BFF إلى أن يصل Contract Pack mutation كامل ويُشغّل owner/stranger/replay على Sandbox.

## Commits

`59bb668` patient pharmacy GET contracts، `cb41fe5` tracking route، `ccce2ff` cart read-only، `ed7a3fd` bounded tracking details، `4f58b89` checkout preview، `1413d70` prescription preview، `92f6dd2` mutation gate.
