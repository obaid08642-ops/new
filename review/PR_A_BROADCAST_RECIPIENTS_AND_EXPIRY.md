# PR-A — تقدم البث والمستلمون والانتهاء المتين

**الحالة:** مراجعة مصدرية فقط؛ **REJECT / NO-MERGE / NO-DEPLOY**. لا يشغل هذا PR أي cron أو queue worker أو caller أو migration.

## الجذور والنتيجة

| الجذر | النتيجة الحاكمة |
|---|---|
| `PharmacyBroadcastService.getBroadcastStages` | لا fallback تجاري صامت؛ السياسة يجب أن تكون موجودة وصحيحة أو يرجع `503 validated_pharmacy_broadcast_policy_required`. |
| `PharmacyBroadcastService.broadcastRound` | ينشئ membership في `pharmacy_broadcast_recipients` وoutbox intent واحداً لكل recipient داخل transaction؛ لا يرسل push/socket ولا يبتلع فشله. |
| `PharmacyExpiryCommandService` | يمسح due offers/due broadcasts بcursor مستقل وlimit 1–100؛ lease claim ذري؛ ينهي draft/submitted فقط، ويضيف مستلمي الجولة الجدد من server eligibility أو يحيل manual review عند policy غير متاحة/جولة أخيرة. |
| `pharmacy_broadcast_recipients` | سجل عضوية مستقل قابل للفهرسة الفريدة على `(broadcast_id, pharmacy_account_id)`؛ يقي من التكرار عند retry/parallel execution. |
| `expire-stale` | بقي endpoint/service entry point مغلقين صراحةً. لا توجد آليتان متنافستان للانتهاء. |
| `20260827-pharmacy-expiry-indexes.js` | ترحيل يدوي محمي، يفحص duplicate outbox وduplicate recipient memberships قبل إنشاء الفهارس. لم يُشغّل. |

## انتقالات وfailure model

| الحالة | الأمر | أثر النجاح | الفشل |
|---|---|---|---|
| offer `draft/submitted` due | claim → transaction | `expired` + `pharmacy.offer.expired` intent | يفشل command؛ lease ينتهي لاحقاً لإعادة محاولة واعية. `E11000` للـoutbox إعادة idempotent فقط. |
| broadcast مع policy صالحة وجولة تالية | claim → server eligibility | round/deadline جديدان + memberships/intents جديدة فقط | لا transition جزئي صامت؛ transaction تُرجع عند DB/outbox failure. |
| policy غائبة أو آخر round | claim → transaction | broadcast مغلق وorder غير المختار إلى `manual_review` + outbox intent | لا coverage أو best-match أو allocation تلقائي. |
| lease حي أو idempotent duplicate recipient | claim/membership لا يطابق | `skipped_claimed` أو recipient count صفر | لا delivery مباشر ولا duplicate intent. |

## الفهارس والترحيل والتراجع

| collection | index | pre-check | مخاطر/تراجع |
|---|---|---|---|
| `domain_outbox` | `domain_outbox_pharmacy_idempotency_unique` على aggregate/event/idempotency key | aggregate للـduplicates | قد يقفل إنشاء الفهرس؛ backup ونافذة تغيير. لا يحذف بعد تشغيل events إلا بقرار تغيير مستقل. |
| `pharmacy_broadcast_recipients` | `pharmacy_broadcast_recipient_unique` | aggregate للعضويات المكررة | يحتاج cleanup قبل الإنشاء؛ إيقاف caller يكفي للتراجع التشغيلي. |
| `pharmacy_offers`, `pharmacy_broadcasts` | فهارس due scan | تحقق index بعد التنفيذ | فهارس قراءة فقط؛ لا backfill لهذه الدفعة. |

## الأدلة المحلية

| الأمر | النتيجة |
|---|---|
| `npm run build` | ناجح. |
| `npx jest src/modules/pharmacy/tests/pharmacy-broadcast.service.spec.ts src/modules/pharmacy/tests/pharmacy-expiry-command.service.spec.ts --runInBand` | 18 اختباراً ناجحاً. |
| `npx jest src/modules/pharmacy/tests/pharmacy-expiry-command.service.spec.ts --runInBand` بعد حالة الجولة الأخيرة | 6 اختبارات ناجحة. |

لم تُشغّل Mongo replica-set حقيقية أو transaction/outbox indexes حقيقة أو dispatcher/retry/DLQ أو Redis أو push. لا توجد دعوى E2E أو readiness. الخطوة اللاحقة تتطلب قرار المالك الموضح في `OPERATIONAL_DECISION_REQUIRED.md`، وليس تشغيل هذا PR.
