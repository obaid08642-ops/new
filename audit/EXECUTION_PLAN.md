# خطة التنفيذ لإغلاق كل الفجوات — أولويات مرتبة

> مبنية على: `FINDINGS/gap-matrix.md` (إجماليات 22/49/3/1/2/5 = 82) + `FINDINGS/master-gap-list.md` + عناصر CI الحمراء.
> القاعدة الصفرية سارية: كل إصلاح بدليل `file:line` حقيقي.

## المرحلة A — تخضير CI (أولاً: يفتح الباب لكل تحقق لاحق)
| # | الإصلاح | الدليل |
|---|---|---|
| A1 | `auth.guard.spec` — impersonation rejects | `backend/src/common/auth.guard.spec.ts` |
| A2 | `pharmacy-journey-spec` — DTO deep-equality | `backend/src/modules/pharmacy/services/pharmacy-journey-spec.spec.ts` |
| A3 | `search-intent` — تمييز أحياء جدة | `backend/src/modules/search-intent/search-intent.service.spec.ts` |
| A4 | `slot-locks.spec` — `validateForBooking` يرفض بدل أن يحل | `backend/src/modules/slot-locks/slot-locks.service.spec.ts` |
| A5 | `convert-guest` — `string \| undefined` → `string` | `patient-web/app/api/auth/convert-guest/route.ts:38-39` |
| A6 | 3 contract-tests في المزوّد | `PharmacyDashboard.tsx`، `DoctorDashboard.tsx`، `NursingFieldOps.tsx` |

## المرحلة B — إغلاق FAIL الوحيد (P0)
- **R66** (FAIL، P0، L50 في gap-matrix) — أعلى أولوية مرئية بعد CI.

## المرحلة C — PARTIAL من أولوية P0
- **R2**: 12 عنصر fake/mock نشط (`FINDINGS/mock-data.md`).
- **R7**: تطبيق المريض (P0).
- **R10/R11**: التأمين/الخدمات غير الصيدلية.
- **R50/R51**: معالجة الاختراق + تدقيق التسريب/التفويض (`FINDINGS/backend-security.md`).

## المرحلة D — PARTIAL من أولوية P1
- R1 (باكند ثانٍ مهجور `backend/infra/fastapi/` + إعداد MySQL ميت + تكرار provider-wallet ×5 + `compat/admin-spa` اليتيم).
- R3 (فجوة عقود المزوّد/التطبيق — تُغلق مع A6).
- R9/R13/R17/R19/R22/R58–R63/R67/R68 (باكند).
- R6/R12/R14/R16/R18/R20/R24/R26/R30/R54/R68 (ويب المريض).

## المرحلة E — حسم UNCERTAIN بالتحقق (قبل الإصلاح)
- **R49** (أداء TTFB/p95/كتالوج 21k) — قياس أولاً ثم حكم.
- **R56** — تحقق ثم حكم.
- **R77** (L61) — تحقق ثم حكم.

## المرحلة F — PARTIAL من أولوية P2/P3 + الإضافات
- R5/R13/R21/R29/R31/R53/R55/R64/R65/R69/R70/R71/R74 (P2)، R15/R25/R72/R75 (P2/P3).
- الإضافات 18–23: تحسين الرحلات (18) مكتمل جزئياً؛ نظام التوثيق (19) ✅؛ الاختبار المزدوج (20) مع P11؛ Multilingual-Everything (21) — JSON-LD + sitemaps لكل لغة مفتوحة → P9؛ مصفوفة الأجهزة (22)؛ ألترا بريميوم (23/P6-D) — توحيد Expo (مريض v57/مزوّد v54) وتوحيد Tokens.
- R78–R82 (in-progress): تُغلق بتقديم هذا التدقيق واعتماده.

## المرحلة G — BLOCKED خارجي (توثيق + متابعة)
- **R28**: DNS عام `mcp.nabd.plus` — يتطلب حل النطاق خارجياً.
- **R76**: بيانات المتاجر — تتطلب بيانات اعتماد/تقديم يدوي.

## المرحلة H — الإغلاق النهائي
- P11: منظومة الاختبارات الكاملة + إصلاح + إعادة.
- P12/P13: تدقيق التحقق النهائي + تحديث `REPORT-FINAL.md` + `LAUNCH_CHECKLIST.md` + دمج PR #149 عبر المراجع.
