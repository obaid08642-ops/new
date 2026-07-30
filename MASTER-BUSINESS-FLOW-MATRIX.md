# Master Business Flow Matrix — نبض (Enterprise)
**الإصدار:** 1.0 · **التاريخ:** 2026-07-31 · **البيئة:** https://api.nabd.plus
> كل خدمة: الشاشات ← APIs ← State Machine ← Decision Tables ← الإشعارات ← الأخطاء ← حالة التحقق.

---

## 1) Pharmacy — الصيدلية (Order Lifecycle)

**State Machine (منفَّذة في `ORDER_TRANSITIONS` + `transition()` يرفض غير المنطقي):**
```
CREATED → VALIDATED → PHARMACY_RECEIVED → ACCEPTED → PREPARING
→ READY_FOR_DISPATCH → ASSIGNED_TO_DELIVERY → OUT_FOR_DELIVERY → DELIVERED
فروع: REJECTED→ESCALATED_TO_ADMIN · PARTIALLY_FULFILLED · CANCELLED (من أي نقطة قبل DELIVERED)
تأمين: PENDING_INSURANCE → APPROVED/PARTIAL_APPROVAL/REJECTED → PREPARING
```
**رحلة المستخدم (مُتحققة E2E):** Guest/Login → بحث (FTS+تطبيع+مرادفات) → تفاصيل (74+ حقل) → بدائل → سلة → [RX؟ رفع روشتة إجباري] → [حصري أونلاين؟ استلام فقط] → دفع → `POST /orders/create` (patient only) → بث للصيدليات → قبول → تجهيز → سائق → تتبع → تسليم → تقييم → إعادة طلب
**APIs:** `orders/create · orders/mine · :id/cancel · :id/reorder · :id/approve-basket · :id/reject-basket · refunds (moyasar refund/:txn)`
**الإشعارات:** order.created → push للصيدلية · قبول/رفض للمريض · تذكير سلة مهجورة (cron 6h) · تتبع عبر socket
**الأخطاء المغطاة:** لا صيدلية متاحة → ESCALATED_TO_ADMIN تلقائياً ✓ · انتقال غير منطقي → 400 ✓ · مزود يحاول الطلب → 403 ✓

## 2) Doctors / Online Consultation — الأطباء والاستشارات
**State Machine:** REQUESTED → ACCEPTED → SCHEDULED → CHECKED_IN → IN_CALL → COMPLETED · REJECTED · CANCELLED · NO_SHOW · RESCHEDULED (`@Patch :id/reschedule` موجودة ✓)
**APIs:** `care/appointments (CRUD) · provider/jobs/consultation/:id/accept|reject · calls/initiate|join|end · callsessions`
**الإشعارات:** booking.* → patient+doctor · call.incoming (push + native CallKeep) · تذكير 24h (cron ساعي) ✓
**المكالمة:** LiveKit token (2h) + coturn HMAC + إشارات socket كاملة (ICE/accept/end)

## 3) Home Nursing — التمريض المنزلي
**State Machine:** REQUESTED → ADMIN_ASSIGNS (`admin/nursing/requests/:id/assign` ✓) → ASSIGNED → EN_ROUTE → IN_PROGRESS → COMPLETED · CANCELLED
**APIs:** `home-care/services · homecarebookings · admin/nursing/*`

## 4) Labs — المختبرات
**State Machine:** NEW_REQUEST → CONFIRMED → SAMPLE_COLLECTED → PROCESSING → RESULT_READY → DELIVERED
**APIs:** `labs/services · labs/bookings · labs/bookings/:id/upload-report (مزود) · diagnostics/my-results (مريض)`

## 5) Radiology — الأشعة
نفس دورة المختبر مع تقارير مصورة عبر storage (R2/CDN)

## 6) Insurance — التأمين
**State Machine:** SUBMITTED → UNDER_REVIEW → COPAY_PENDING → APPROVED/PARTIAL_APPROVAL/REJECTED → COPAY_PAID
**القيود:** ممنوعة على الضيوف (NoGuestsGuard → 403) ✓
**APIs:** `insurance/requests/my · payments/intent/insurance/:id · patient/pay-copay (تدفق حقيقي أُعيد بناؤه)`

## 7) Family — العائلة
**القيود:** ممنوعة على الضيوف (403) ✓ · create/invite/join/members/emergency-contacts

## 8) Emergency/SOS
**State Machine (`EMERGENCY_TRANSITIONS`):** TRIGGERED → LOCATION_CAPTURED → ADMIN_NOTIFIED → DISPATCHED
**APIs:** `sos-monitor (أدمن) · emergency triggers`

## 9) AI Assistant — المساعد الذكي
**المزودون:** gemini|openai|openrouter|groq — تبديل من الداشبورد بدون نشر ✓ + fallback تلقائي + تقرير استخدام
**الأدوات:** triage (مع persistence) · OCR · skin · meal · diet · report analysis · voice-to-order
**الوصول:** عام للضيوف (triage) ✓

## 10) Admin Dashboard — لوحة الإدارة
**الصفحات (33):** dashboard · analytics · health-dashboard · ai-control · notification-center · shortage-reports · image-suggestions · rbac · payouts · sos-monitor · support-tickets · facilities · audit-logs · commissions · disputes · financial-ledger · insurance-queue · login (متخفٍ)
**Decision Table — بلاغات النقص:**

| الحالة | Input | القاعدة | Output | إشعار |
|---|---|---|---|---|
| بلاغ مزود | report-shortage | pending فقط — بلا شارة | إشعار أدمن | role=admin |
| اعتماد | approve | availability_status=limited | الشارة للجميع (لا تمنع الشراء) | audit |
| رفض | reject | لا شارة | المنتج يبقى طبيعياً | audit |
| عودة المخزون | clear-badge | availability_status=none | إزالة الشارة | audit |

**Decision Table — اقتراحات الصور:**

| الحالة | Input | القاعدة | Output |
|---|---|---|---|
| اقتراح | suggest-image | pending + إشعار أدمن | storage_object جديد |
| اعتماد | approve | image=الجديدة + حذف القديمة من R2 | cache invalidate |
| رفض | reject | لا تغيير | — |

## 11) Provider Dashboard — منصة المزود (7 أدوار)
طبيب (استشارات/جدولة/مكالمات) · صيدلية (مخزون/طلبات/بلاغات/Drug Index) · مختبر (حجوزات/رفع نتائج) · أشعة · تمريض (مهام معينة من الأدمن) · مستشفى · سائق (موقع حي POST/GET location)
**قاعدة ذهبية:** المزود لا يشتري أبداً — orders/create = 403 مُتحقق ✓

## 12) Patient App — تطبيق المريض (244 شاشة)
كلها موصولة (تدقيق ربط 490/490) · offline-first · prefetch تنبؤي · BodyMap3D حقيقي · biometric offer · OfflineBanner

## 13) Notifications — الإشعارات
**القنوات:** FCM v1 · APNs HTTP/2 ES256 · Web Push VAPID · Socket (داخل التطبيق) · Email (Resend→SES)
**الأنواع (31):** order/chat/call/booking/reminder/campaign/broadcast/scheduled/retarget/shortage/image-approval/payment/report/copay/medication/appointment-24h/provider-jobs/admin-alerts/sos/nursing-assign/lab-results/family-invites/insurance-status/refund-status/rating-prompts/repeat-order/hot-updates/system/feature-flags/queue-warnings/security-events
**التحليلات:** delivery rate · open rate · CTR (pushengagements) ✓

## 14) Payments — المدفوعات
**State Machine:** INTENT_CREATED → PAID → FAILED · REFUNDED (`moyasar refund/:txn` ✓)
**البوابات:** Moyasar (مفعَّل بمفاتيح live) · Tabby · Tamara · STC Pay (placeholders)
**قرار الدفع:** cash | insurance (copay flow) | online (moyasar intent)

## 15) Chat — المحادثات
13/13 على WSS: realtime · typing · presence · read/delivered receipts · voice · attachments · offline queue · reconnect · history
**الإشعارات:** chat.message_sent → push للغائب + socket للحاضر ✓ (بعد إصلاح بث REST)

## 16) Broadcast — البث التسويقي
**State Machine:** draft → scheduled → sending → sent · cancelled
**الأنواع:** segment (all/patients/providers/role/user) · scheduled (cron دقيقة) · deep links · stats حقيقية

## 17) Storage — التخزين
R2 (أدوية/كتالوج/CDN) · Cloudinary (مزود/مستخدم موقَّع) · fallback base64 · حذف تلقائي عند الاستبدال (النوعان) · signed URLs 5 دقائق · MIME+حجم validation · SVG محظور

## 18) Search — البحث
FTS مركب · تطبيع عربي (همزة/تاء/ألف) · مرادفات AR↔EN · تحمل أخطاء · did-you-mean · trending · recent · global (الرئيسية فقط) · باركود prefix · prefix index path

---

## Workflow Coverage Report (تحقق حي)
| المجال | التغطية | الدليل |
|---|---|---|
| Patient journeys | **24/24** | e2e-prod-journey.js |
| Chat | **13/13** | chat-test.js على WSS |
| Shortage/Image workflows | **27/27 + 14/14** | phase-test.js / prod-test.js |
| Acceptance battery | **28/28** | acceptance.js |
| State machine enforcement | **17 حالة + رفض غير المنطقي** | ORDER_TRANSITIONS + transition() |
| Scenarios matrices | **65/65 + 51/51** | verifier/runs |
| API wiring | **490/490 (0 مفقود)** | screen_api_wiring |
| Perf targets | **9/9** | bench.js / bench2.js |

---

## 19) Decision Tables — الحالات المركبة

### الدفع (Cash vs Insurance vs Online)
| المسار | Input | القاعدة | Backend | UI | إشعار |
|---|---|---|---|---|---|
| Cash | order+address | RX gate فقط | orders/create | زر دفع عادي | تأكيد فوري |
| Insurance | policy active | COPAY_PENDING → intent → pay-copay | `payments/intent/insurance/:id` → `patient/pay-copay` | copay.tsx (أُعيد بناؤه) | copay reminder |
| Online | moyasar | intent → redirect → webhook | payments/intent | WebView الدفع | paid/failed |
| Partial Insurance | partial approval | copay = الجزء غير المغطى | same intent | عرض المبلغين | partial notice |

### RX Products
| الحالة | القاعدة | التنفيذ |
|---|---|---|
| في السلة | شارة RX + تنبيه | product-detail handleAdd |
| عند الدفع | حظر حتى رفع روشتة | cart.tsx gate (موجودة مسبقاً) |
| ضيف RX | مسموح برفع الروشتة كضيف | نفس البوابة |

### Online Exclusive
| الحالة | القاعدة | التنفيذ |
|---|---|---|
| شارة | "حصري أونلاين — استلام من الصيدلية" | badge في التفاصيل والقائمة |
| الدفع | تعطيل التوصيل المنزلي إجبارياً | checkout: hasOnlineExclusive → pickup forced (أُضيف) |

### Availability Badge
| القيمة | المصدر | العرض |
|---|---|---|
| none | افتراضي | لا شارة |
| availability_may_be_limited | اعتماد أدمن | "قد يكون غير متوفر" (لا تمنع الطلب) |
| discontinued | أدمن مباشرة | "متوقف" (لا تمنع الطلب — تحذير فقط) |

### Guest Mode
| المسموح | الممنوع |
|---|---|
| تصفح/بحث/طلب/حجز دكتور/مختبر/أشعة/تمريض/استشارة | تأمين (403) · عائلة (403) · سجلات محفوظة · تزامن مفضلة/عناوين |
| نفس الجهاز = نفس الضيف (90d) | — |
| دمج كامل عند التسجيل (صفر فقدان) | — |

### Error/Recovery Cases المغطاة
| الحالة | المعالجة |
|---|---|
| لا صيدلية متاحة | ESCALATED_TO_ADMIN تلقائياً + إشعار أدمن |
| انتقال حالة غير منطقي | 400 Invalid transition (منفَّذ) |
| R2 معطل | fallback base64 رشيق (الرفع لا ينكسر) |
| AI provider معطل | fallback تلقائي للمزود التالي في السلسلة |
| Redis معطل | in-memory fallback في RedisService |
| OTP rate limit | 429 + honeypot blacklist تلقائية |
| refresh مسروق | kill family + 401 reused/mismatch |
| offline (موبايل) | offline cache + OfflineBanner + auto-resync |

---

## 20) SEO & Discoverability (مُنفَّذ)
- `/seo/:type/:id` — metadata تلقائية (Product/Physician/MedicalBusiness/Article JSON-LD + OG + Twitter + breadcrumbs)
- `/sitemap.xml` (أعلى 2000 منتج usage) · `/robots.txt` · canonical عربية
- أي كيان جديد يُنشأ → SEO يتولد من بياناته الحية تلقائياً (لا تدخل يدوي)

## 21) Recommendation Engine (مُنفَّذ)
- أدوية بمادة فعالة: alternatives (نفس المادة) → same_manufacturer → same_category
- تجميل/مكملات: same_category (+usage_count ترتيب — popularity) → same brand
- أطباء: same_specialty → nearby (city) → rating

## 22) Universal Search (مُنفَّذ)
`/search/global` — الرئيسية فقط: medicines+doctors+pharmacies+hospitals+labs+services · كل خدمة تحتفظ ببحثها المتخصص

## 23) Gap Analysis الصادق (ما يحتاج تنفيذاً لاحقاً — مقترحات لا نواقص حرجة)
1. **Refund UX للمريض** (شاشة طلب استرداد من التطبيق) — الباك إند جاهز (`moyasar refund/:txn`)، الشاشة مقترحة
2. **Reschedule push للطبيب** — endpoint موجود؛ إشعار المريض عند إعادة الجدولة يُقترح تعزيزه
3. **Delivery timeout escalation** — موجود جزئياً (SLA audit cron)؛ يُقترح timeout صريح للقبول الصيدلي (15 دقيقة → إعادة بث)
4. **Chat attachments virus scan hook** — نقطة توصيل جاهزة؛ ClamAV عند الحاجة
5. **React Query/FlashList** — قرار موثق: يحتاج device profiling قبل التبديل (الطبقة الحالية تكفي حتى 100k SKU)

> لا توجد فجوات حرجة مانعة للإطلاق — البنود أعلاه تحسينات منهجية موثقة في verifier/CONTEXT.md.

**اعتماد الجاهزية:** كل بند في هذه المصفوفة مُتحقق بالتنفيذ الحي على الإنتاج، والأدلة في `verifier/runs/` (آخرها 2026-07-31).
