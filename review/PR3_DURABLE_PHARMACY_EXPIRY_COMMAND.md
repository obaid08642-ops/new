# PR-3 — أمر انتهاء العروض والبث المتين

**الفرع:** `remediation/provider-production-governed`  
**الحالة:** مخصص للمراجعة فقط. لا يوجد scheduler أو queue worker أو cron أو نشر أو تنفيذ ترحيل في هذه الدفعة.

## ما تغيّر

| الجذر | السلوك |
|---|---|
| `PharmacyExpiryCommandService.expireDuePharmacyOffers(now,cursor,limit)` | أمر صريح، محدود إلى 1–100 سجل لكل نوع، يعيد cursor، ويستقبل clock فقط كوسيط داخلي/اختبار؛ مسار الإدارة لا يقبل وقت العميل. |
| offer expiry | يطالب بعقد منتهٍ ذرياً بlease token 60s، ثم داخل transaction يغيّر draft/submitted إلى expired ويسجل outbox intent idempotent. |
| broadcast expiry | يطالب بجولة منتهية بlease token، فيقدّم الجولة وموعدها المحفوظ، أو يغلق الجولة الأخيرة وينقل order غير المختار إلى `manual_review`. لا ينشئ allocation ولا يحجز stock. |
| `round_expires_at` | موعد مطلق محفوظ عند بدء البث وعند التقدم، بدلاً من حساب `updatedAt` لدى sweep. سجلات البث القديمة التي لا تملك الموعد لا تنتهي تلقائياً؛ هذا fail-closed مقصود حتى backfill معتمد. |
| outbox/index migration | ملف يدوي محمي `scripts/migrations/20260827-pharmacy-expiry-indexes.js` يرفض التنفيذ افتراضياً. قبل إنشائه للفهرس الفريد، يفحص التكرارات في domain_outbox. لم يُشغّل هنا. |
| API إداري | `POST /admin/pharmacy/broadcasts/expire-due?offer_cursor=&broadcast_cursor=&limit=` محروس بحارس ADMIN. المسار `expire-stale` السابق مغلق ويرجع 503. |

## جدول الانتقالات

| الكيان | الحالة المستحقة | النتيجة | أثر ممنوع |
|---|---|---|---|
| Offer | `draft/submitted` و`quote_expires_at <= now` | `expired` مع intent `pharmacy.offer.expired`. | لا اختيار، لا allocation، لا حجز. |
| Broadcast غير نهائي | `open` و`round_expires_at <= now` | جولة +1 وموعد جديد محفوظ مع intent `pharmacy.broadcast.round_advanced`. | لا matching أو split أو allocation. |
| Broadcast نهائي | `open` و`round_expires_at <= now` | `closed`، وorder غير المختار إلى `manual_review` مع intent `pharmacy.broadcast.closed`. | لا best-match تلقائي ولا تخصيص. |
| سجل يملك lease حي | claim لا يطابق | `skipped_claimed`، قابل لإعادة المحاولة بعد انتهاء lease. | لا كتابة مكررة. |

## سلامة الفهارس والترحيل والتراجع

يتطلب بدء التشغيل المستقبلي في بيئة معتمدة أولاً نافذة تغيير ونسخة احتياطية ومراجعة تكرارات `domain_outbox`. عندها فقط يمكن تشغيل **يدوياً**:

```bash
APPLY_DB_MIGRATION=20260827 MONGODB_URI='...' node scripts/migrations/20260827-pharmacy-expiry-indexes.js
```

ينشئ ذلك فهارس المسح والعقدة الفريدة `domain_outbox_pharmacy_idempotency_unique`. لا تشغّل هذا الأمر في production كجزء من هذا الطلب. التراجع التشغيلي هو إيقاف مستدعي الأمر؛ التراجع البنيوي يتطلب قرار change-management منفصل لأن حذف فهرس فريد بعد بدء كتابة الأحداث قد يعيد خطر التكرار. لا يوجد backfill لهذه الدفعة؛ سجلات البث القديمة غير المؤرخة تبقى للمراجعة اليدوية.

## خيارات المستدعي المستقبلية — قرار مطلوب قبل التفعيل

| النهج | المفاضلة | الكلفة | تعقيد الإعداد |
|---|---|---:|---|
| أمر إداري يدوي محدود | أعلى ضبط بشري، مناسب للتجربة والتحقق؛ قد يؤخر الانتهاء. | لا تكلفة تشغيلية جديدة. | منخفض؛ مسار ADMIN فقط. |
| cron خارجي على خادم مخصص كل 1–5 دقائق | متين خارج عملية API ويمكنه تمرير cursor؛ يحتاج حماية سرّية ومراقبة وتأخير مقبول. | تكلفة استضافة/مراقبة خارجية. | متوسط. |
| عامل queue متين بعد معالجة Redis MISCONF | أفضل throughput وretry/DLQ عند كثافة أعلى؛ يتطلب قرار بنية ومراقبة وأثر تشغيلي أكبر. | تكلفة worker/Redis/mراقبة. | عالٍ. |

لا تختار هذه الدفعة أي نهج ولا تبدأ أي مستدعي. إن اختير لاحقاً، يجب أن يستدعي endpoint المقيد أو command من شبكة موثوقة، ويُسجّل `now/cursor/result`، ويبدأ بحد أدنى، ويعالج `next_cursor` حتى يصبح null، ويصدر تنبيهاً عند `skipped_claimed` المتكرر أو فشل outbox.

## الاختبارات المحلية

| الأمر | النتيجة |
|---|---|
| `npm run build` | ناجح بعد تسجيل الخدمة والمسار. |
| `npx jest src/modules/pharmacy/tests/pharmacy-expiry-command.service.spec.ts --runInBand` | 4/4 ناجح: claim، outbox، idempotency، round advancement بلا allocation، cursor. |

لم تختبر هذه الدفعة Mongo replica set حقيقياً أو transaction/outbox index حقيقياً أو Redis أو worker/cron أو E2E أو PSP أو S3/R2 أو Push أو Expo device. لذلك لا تمثل صلاحية إنتاج أو إذن دمج.
