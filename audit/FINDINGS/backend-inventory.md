# الجرد المعمقي — الباكند (NestJS + Mongoose/MongoDB)
> المصدر: فحص مباشر للكود (P1-wave-1). كل بند بدليل file:line. الحالات تُحسم في P2.

## البنية
- `src/main.ts`: global prefix `api` + versioning URI v1 → القاعدة `/api/v1`. helmet, mongo-sanitize, Swagger `/api/docs` (معطل إنتاجياً إلا `SWAGGER_ENABLED=true`).
- `src/app.module.ts:182`: BullModule.forRoot + EventEmitter + Mongoose root.
- **116 موديول** تحت `src/modules/`. **278 `@Controller(` في 155 ملفاً. 1602 route decorators** (Get 730 / Post 704 / Patch 67 / Delete 60 / Put 41).
- **DB = Mongoose/MongoDB فقط. صفر SQL** (grep drizzle/prisma/mysql/typeorm في src+package.json = صفر).
- Schemas: `src/schemas/` (72 ملفاً: User, PatientProfile/PatientSettings مع `nphies_eligible`, Appointment, Order, Medicine, Prescription, PharmacyInventory, PharmacyChat, Insurance*, Lab, Radiology, HomeCare, Wallet/WalletTransaction, Transaction, SlotLock, ProductRankingMetrics, Notification, PushToken, SystemEvent, UniversalActivity, AuditLog...) + 41 schema محلية داخل الموديولات.
- اختبارات: **117 `*.spec.ts`** + `test/` (9 ملفات e2e: enterprise/security/finance/analytics/segments/coupons/boot/seo) + `e2e/` (بوابات حية مدمرة — معزولة عبر env).

## المصادقة (auth — 12 ملفاً)
- OTP عبر Redis (TTL 5د، 5 محاولات، قفل 15د، anti-enumeration) + refresh rotation (jti في Redis، 14 يوم، device-bound) — `auth.service.ts` (1028 سطراً).
- `passkey.controller/service` (WebAuthn) + `device-trust.service` (تجاوز 2FA للأجهزة الموثوقة) + JwtAuthGuard مخصص (بلا passport strategies — يُتحقق من التكافؤ).
- Throttle ضد brute-force/SMS.

## تأكيد الوجود (نعم/لا + ملفات مفتاحية)
| النطاق | الحالة |
|---|---|
| pharmacy (57 ملفاً: orders/offers/broadcast/chat/inventory/expiry/insurance-decision/payment-evidence/shortage/procurement/quotations + 14 repo + 9 tests) | ✅ موجود |
| insurance + insurance-engine (mock eligibility + `nphies_live:false` + تدفق BR-2 PENDING_PROVIDER_REVIEW) | ✅ موجود — يُطابق نموذج "رفع المزوّد" مبدئياً |
| **nphies: MOCK ONLY** — `modules/nphies/nphies.validator.ts` (mock `validateNphies()`) + 29 سطراً مرجعياً (insurance.module، radiology gatekeeper، patient-profile `nphies_eligible`، provider-production) — يُحسم في P2: لا تكامل حي = متوافق مع المواصفة المعتمدة متى ما أُزيل أي ادعاء | ⚠️ يُحسم P2 |
| product-ranking (controller/service/event/metrics + spec) | ✅ موجود |
| search-intent + entity-graph + seo-search (auto-index) | ✅ موجود |
| seo (slugs/sitemap/robots/IndexNow + 6 repos) + auto-entity-seo-pipeline | ✅ موجود |
| mcp (`POST /` RPC + tools/server-card + MCP_TOOLS + spec) | ✅ موجود |
| notifications (BullMQ delivery + mail processor) + push (FCM/Expo/APNs/VAPID) + sms (@Global) | ✅ موجود |
| payments (Paymob) + moyasar (ApplePay/CC) + wallet + payouts (عبر finance-engine/LedgerService) + webhooks | ✅ موجود |
| prescriptions (doctor-only create + state-machine + auth spec) | ✅ موجود |
| slot-locks (10-min TTL + anti-collision + spec) | ✅ موجود |
| unified-bookings (منسق 5 دومينات عبر WorkflowEngine+EventBus) | ✅ موجود |
| admin-enterprise (22 ملفاً: analytics/CRM/CMS/coupons/disputes/finance/impersonation/ops/orders/security/segments/GDPR) | ✅ موجود |

## روائح معمارية (تُحسم P2/P3)
- `compat.module` (~30 controller مضمّن) + `admin-spa.module` (~40 controller) — وحدات إلهية مرشحة للتفكيك.
- موديولات أحادية الـ stub: analytics, business-rules, consistency, event-reliability, hospital-staff, legacy, mail, operations-safety, provider-jobs, ratings — يُتحقق: حقيقية أم قشرية.
- موديولات "service spec only" بلا تنفيذ ظاهر: booking-flow, booking-ops, facility-ops, medical-programs, patient-ux — يُتحقق: spec لشيء محذوف أم تغطية مفقودة.
- `cart` = service داخل ملف الموديول (نحيف — يُتحقق من اكتماله).
- `finance-engine` = ملف واحد (LedgerService) — يُتحقق من double-entry.
- Seed: `provider-seed.service` (sample، idempotent، موسوم) + `seed.service` (test data بتفعيل صريح) — يُتحقق من عدم تسربها للإنتاج.
- Realtime: 3 بوابات (realtime/chat/socket-legacy) + BullMQ queues (notifications-delivery, email-queue) + EventEmitter (~35 ملفاً).
