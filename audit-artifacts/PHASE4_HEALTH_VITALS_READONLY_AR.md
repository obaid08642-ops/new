# Phase 4 — Health Vitals History Read-only

تمت إضافة `/[locale]/health/vitals` بناءً على شاشة Mobile `/health/vitals` والعقد الحقيقي `GET /health/vitals?limit=100`. يعرض السجل key/value/unit/context/measuredAt من القراءات المحفوظة للمريض فقط.

لا توجد قيم افتراضية أو اتجاهات synthetic أو تشخيصات. لم يتم فتح POST/PATCH/DELETE vitals؛ أُبقيت الإضافة والتعديل والحذف Deferred حتى تتوفر عقود idempotency/replay الآمنة.

التحقق: full Vitest، truthful-runtime، TypeScript، production build، وdiff check.
