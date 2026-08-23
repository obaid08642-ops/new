# Local Sandbox Contract Harness

## التشغيل

من جذر المشروع:

```bash
pnpm test:local-sandbox
```

أو مباشرة:

```bash
node scripts/run-local-sandbox-contracts.mjs
```

## ما الذي يختبره؟

يشغل السكريبت خادماً مؤقتاً على `127.0.0.1` ومنفذ عشوائي، ثم يختبر تسع حالات deterministic: unauthenticated=401، owner read=200، stranger read=404، owner order read=200، stranger order read=404، رفض mutation دون `Idempotency-Key`، نجاح mutation للمالك، replay بنفس النتيجة للمفتاح نفسه، و404 للـstranger عند mutation.

## ضمانات السلامة

السكريبت لا يقرأ `NABD_API_BASE_URL` ولا أي credential، ولا يتصل بـDNS أو production أو Sandbox. التوكنات والـIDs داخله اصطناعية ومحصورة في خادم loopback المؤقت؛ لا تُستخدم في runtime ولا تُعد بيانات إنتاج.

## حدود الدليل

النجاح الناتج يكون `LOCAL_SIMULATION` فقط. هو يثبت منطق الحالات والحماية داخل harness المحلي، لكنه لا يثبت أن backend production يعيد الحالات نفسها، ولا يثبت cookies الفعلية أو payment/refund أو LiveKit أو ownership في قاعدة البيانات. لإغلاق بوابة Sandbox يجب تشغيل `pnpm test:sandbox` ببيئة Sandbox رسمية، ثم حفظ نتيجة الشبكة الفعلية منفصلة عن هذا التقرير.
