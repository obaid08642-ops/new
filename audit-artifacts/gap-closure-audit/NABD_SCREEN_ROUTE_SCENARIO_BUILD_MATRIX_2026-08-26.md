# Nabd — مصفوفة بناء الشاشات والمسارات والسيناريوهات الناقصة

**الإصدار:** 2026-08-26
**الغرض:** ملحق تنفيذي لمخطط التحول الإنتاجي. يحول صفوف تدقيق Web المصدرية إلى قائمة بناء قابلة للمراجعة، ويحدد أسطح Mobile التي تحتاج تصحيحًا لا نسخًا، ويضع catalog مشروطًا لـProvider وAdmin حتى يُنجز تدقيقهما.

> **الحد الدليلي:** جميع صفوف Patient Web في الملحق أدناه مستخرجة حرفيًا من سجل parity: `189 MISSING_CAPABILITY` و`53 STATIC_MATCHED_PARTIAL`. التصنيف يثبت غياب/جزئية surface في مصدر Web المقروء، ولا يثبت غياب backend endpoint أو integration حية. أسطح Mobile المذكورة هي أعمال تصحيح مستمدة من findings، لا قائمة افتراضية لنسخ 246 route. Provider/Admin لا يتحولان إلى build final قبل التدقيق اليدوي والعقود.

## 1. كيفية استخدام المصفوفة

| الحقل | الاستخدام الإلزامي |
|---|---|
| Priority | `P0` يمنع إطلاق journey أساسي؛ `P0-SAFETY` يمنع كشف ميزة سريرية/طوارئ؛ `P1` بعد إغلاق الأساس؛ `P2` after launch only. |
| Build status | `BUILD` = surface مفقود؛ `COMPLETE_OR_REPLACE` = surface جزئي يحتاج عقد/CTA/state حقيقي؛ `AUDIT_FIRST` = Provider/Admin/Backend غير مثبت. |
| Contract slice | يكتب قبل الكود: CTA, actor, method/event, schemas, authz, authoritative source, state transition, audit, notification, failure/recovery. |
| Scenario | ليست شاشة happy path؛ يلزم loading/empty/error/offline/denied/expired/concurrent/retry/cancel. |
| Done | لا إغلاق من UI فقط: contract + source-of-truth + tests + runtime + operations evidence. |

## 2. مصفوفة Mobile: تصحيح الرحلات والأسطح ذات الخطورة المثبتة

| Mobile module / surfaces | Build or correction required | Required scenarios | Blocking contract / acceptance |
|---|---|---|---|
| Auth/onboarding/session: login, OTP, reset, guest, permissions/legal | إلغاء identifier/OTP/reset التناقضات وguest fallback بعد 401/403؛ بناء registration/social/2FA/recovery فقط بعقد حقيقي. | new/existing/locked account; OTP expiry/replay; invalid/limited attempts; session expiry; logout all devices; consent version; offline. | IAM/session/consent pack; owner/stranger/unauth; rate limit and audit; no silent guest. P0. |
| Profile/address/family/PHI: profile, addresses, QR/share, family, reports, health data | إعادة بناء edit/delegation/share حول server authorization وconsent؛ لا مشاركة/QR/child/family path بلا scope/revoke. | invite/accept/decline; scope/expiry/revoke; address invalid/unserviceable; report access/export; data correction/delete. | PHI/delegation pack; audited access, retention, policy; physical device/runtime tests. P0. |
| Pharmacy tab/cart/Rx/manual order/broadcast/offers/payment/tracking/returns | استبدال cached/manual/local flow بالرحلة الكاملة offers; بناء wait/no-offer/selection/substitution/COD/insurance states. | Rx required/invalid; partial stock; substitutions; offer race/expiry; payer reject/co-pay; PSP fail; dispatch issue; return/dispute. | Pharmacy offer/order/ledger/payer/provider contracts; selected-offer lock; reconciliation. P0. |
| Consultations/nursing/services/booking/payment/call/waiting | استبدال client filters/fallback appointment ID/local outcomes بحجز authoritative؛ call room لا يدخل بلا entitlement. | slot race/expiry; provider reject; cash fail; insurance full/partial/reject; reschedule/no-show; call device/network failure; post-care. | Unified booking, scheduling, payment/payer, call-token and provider workflows. P0. |
| Labs/radiology/home-care: catalog, selection, booking, prep/result/visit | إكمال service/provider/slot/quote/payment/insurance/result journey؛ لا report badge أو catalog كدليل completion. | home eligibility; prep missed; collection delay; result correction; provider cancellation; report access delegation. | Diagnostic/home-care booking/result provenance/assignment contracts. P0. |
| Wallet/cards/payment outcomes/returns/loyalty | حذف raw-card/local success/fake wallet/refund semantics؛ بناء financial UI فقط فوق PSP+ledger. | authorization/capture/fail/retry; webhook pending; refund/dispute; stale balance; duplicate transfer; points reversal. | PSP/ledger/reconciliation/refund policy. P0 for payment/refund; P1 loyalty/wallet. |
| Insurance hub/policy/benefits/co-pay/claims | استبدال fake policy/benefit/scraping/local approval بقرارات payer versioned وسبب/بدائل. | eligibility unavailable; full/partial/reject; co-pay expiry; patient cash/cancel choice; claim evidence. | Payer authorization/decision/co-pay contract and consent. P0. |
| Emergency/AI/mental health/nutrition/maternity | عدم كشف action مصطنع؛ بناء فقط بعد safety packs أو حجب surfaces. | uncertainty/refusal; crisis escalation; emergency acknowledgement/failure; clinical content expiry; locale. | Clinical safety, SOP, human escalation, evidence/guidance governance. P0-SAFETY. |
| Wearables/scanner/voice/search/map/deep links | إكمال OS permission/data minimization/freshness/authorization أو حجب; resolver/type integrity. | permission denied; unavailable hardware; unknown scan; voice delete; bad slug; map/location consent. | Device/OS/privacy/search/publication contracts. P1 or P0 when needed by launched journey. |
| Settings/support/notifications/articles/community/reviews | تحويل summaries/local toggles إلى real controls or hide; content/review/community moderation. | privacy revoke/export; notification delivery/action; support attachment; abuse report; review eligibility. | Privacy/support/content/moderation contracts. P0 for security/support; P1 content/community. |

## 3. Patient Web: exact source-derived surfaces to build or complete

The following tables enumerate every Web parity row classified `MISSING_CAPABILITY` or `STATIC_MATCHED_PARTIAL`. A missing Web surface is not automatically a launch requirement: the priority and scenario show whether it is required by the production service scope or must remain unpublished until its safety/financial/clinical contract exists.

### 3.(auth) — `P1` — Cross-cutting / source reconciliation

**Required journey scenario:** complete exact CTA → contract → authz → authoritative data → real result/error/recovery; no source evidence of backend behavior is assumed

| ID | Mobile-origin route / required Web surface | Build status | Source finding / boundary | Required completion definition |
|---|---|---|---|---|
| PM-001 | `(auth)/forgot-password` | BUILD | No localized forgot-password page or password-recovery handler found in reviewed Web source tree. Evidence: audit-artifacts/gap-closure-audit/patient-web-manual-evidence/AUTH_SESSION_PRIVACY_FAMILY_MANUAL_REVIEW_2026-08-26.md | CTA→contract→authz→authoritative data→all state branches→tests/runtime/ops evidence. |
| PM-002 | `(auth)/login` | COMPLETE_OR_REPLACE | Login form provides password, OTP and 2FA client paths; visual parity and upstream contract remain unproven. Evidence: audit-artifacts/gap-closure-audit/patient-web-manual-evidence/AUTH_SESSION_PRIVACY_FAMILY_MANUAL_REVIEW_2026-08-26.md | CTA→contract→authz→authoritative data→all state branches→tests/runtime/ops evidence. |
| PM-003 | `(auth)/otp` | COMPLETE_OR_REPLACE | OTP is an in-form state, not a separately evidenced query route; one-time exchange/cookie behavior requires Backend/runtime reconciliation. Evidence: audit-artifacts/gap-closure-audit/patient-web-manual-evidence/AUTH_SESSION_PRIVACY_FAMILY_MANUAL_REVIEW_2026-0 | CTA→contract→authz→authoritative data→all state branches→tests/runtime/ops evidence. |
| PM-004 | `(auth)/privacy` | BUILD | Settings provides read-only privacy/security summaries; no consent or privacy-management mutation CTA is evidenced. Evidence: audit-artifacts/gap-closure-audit/patient-web-manual-evidence/AUTH_SESSION_PRIVACY_FAMILY_MANUAL_REVIEW_2026-08-26.md | CTA→contract→authz→authoritative data→all state branches→tests/runtime/ops evidence. |
| PM-006 | `(auth)/register` | BUILD | No localized registration page or registration handler found in reviewed Web source tree. Evidence: audit-artifacts/gap-closure-audit/patient-web-manual-evidence/AUTH_SESSION_PRIVACY_FAMILY_MANUAL_REVIEW_2026-08-26.md | CTA→contract→authz→authoritative data→all state branches→tests/runtime/ops evidence. |
| PM-007 | `(auth)/reset-password` | BUILD | No localized reset-password page or reset-password handler found in reviewed Web source tree. Evidence: audit-artifacts/gap-closure-audit/patient-web-manual-evidence/AUTH_SESSION_PRIVACY_FAMILY_MANUAL_REVIEW_2026-08-26.md | CTA→contract→authz→authoritative data→all state branches→tests/runtime/ops evidence. |
| PM-008 | `(auth)/terms` | BUILD | No localized terms/acceptance page or handler found in reviewed Web source tree. Evidence: audit-artifacts/gap-closure-audit/patient-web-manual-evidence/AUTH_SESSION_PRIVACY_FAMILY_MANUAL_REVIEW_2026-08-26.md | CTA→contract→authz→authoritative data→all state branches→tests/runtime/ops evidence. |
| PM-009 | `(auth)/welcome` | COMPLETE_OR_REPLACE | Public landing is a partial web welcome alternative but does not evidence native onboarding/legal/account-choice equivalence. Evidence: audit-artifacts/gap-closure-audit/patient-web-manual-evidence/AUTH_SESSION_PRIVACY_FAMILY_MANUAL_REVIEW_2026-08-26.md | CTA→contract→authz→authoritative data→all state branches→tests/runtime/ops evidence. |

### 3.ai — `P0-SAFETY` — AI/clinical safety

**Required journey scenario:** approved use → consent/input minimization → grounded output/uncertainty → refusal/human escalation → evaluation/audit

| ID | Mobile-origin route / required Web surface | Build status | Source finding / boundary | Required completion definition |
|---|---|---|---|---|
| PM-021 | `ai/chat-doctor` | BUILD | No localized Web AI feature surface/CTA found. Evidence: audit-artifacts/gap-closure-audit/patient-web-manual-evidence/AI_EMERGENCY_WALLET_LOYALTY_RETURNS_MANUAL_REVIEW_2026-08-26.md | CTA→contract→authz→authoritative data→all state branches→tests/runtime/ops evidence. |
| PM-022 | `ai/monthly-report` | BUILD | No localized Web AI feature surface/CTA found. Evidence: audit-artifacts/gap-closure-audit/patient-web-manual-evidence/AI_EMERGENCY_WALLET_LOYALTY_RETURNS_MANUAL_REVIEW_2026-08-26.md | CTA→contract→authz→authoritative data→all state branches→tests/runtime/ops evidence. |
| PM-023 | `ai/prescription-translator` | BUILD | No localized Web AI feature surface/CTA found. Evidence: audit-artifacts/gap-closure-audit/patient-web-manual-evidence/AI_EMERGENCY_WALLET_LOYALTY_RETURNS_MANUAL_REVIEW_2026-08-26.md | CTA→contract→authz→authoritative data→all state branches→tests/runtime/ops evidence. |
| PM-024 | `ai/skin-analysis` | BUILD | No localized Web AI feature surface/CTA found. Evidence: audit-artifacts/gap-closure-audit/patient-web-manual-evidence/AI_EMERGENCY_WALLET_LOYALTY_RETURNS_MANUAL_REVIEW_2026-08-26.md | CTA→contract→authz→authoritative data→all state branches→tests/runtime/ops evidence. |
| PM-025 | `ai/symptom-checker` | BUILD | No localized Web AI feature surface/CTA found. Evidence: audit-artifacts/gap-closure-audit/patient-web-manual-evidence/AI_EMERGENCY_WALLET_LOYALTY_RETURNS_MANUAL_REVIEW_2026-08-26.md | CTA→contract→authz→authoritative data→all state branches→tests/runtime/ops evidence. |
| PM-026 | `ai/symptom-timeline` | BUILD | No localized Web AI feature surface/CTA found. Evidence: audit-artifacts/gap-closure-audit/patient-web-manual-evidence/AI_EMERGENCY_WALLET_LOYALTY_RETURNS_MANUAL_REVIEW_2026-08-26.md | CTA→contract→authz→authoritative data→all state branches→tests/runtime/ops evidence. |
| PM-027 | `ai/triage` | BUILD | No localized Web AI feature surface/CTA found. Evidence: audit-artifacts/gap-closure-audit/patient-web-manual-evidence/AI_EMERGENCY_WALLET_LOYALTY_RETURNS_MANUAL_REVIEW_2026-08-26.md | CTA→contract→authz→authoritative data→all state branches→tests/runtime/ops evidence. |

### 3.ai-assistant — `P1` — Cross-cutting / source reconciliation

**Required journey scenario:** complete exact CTA → contract → authz → authoritative data → real result/error/recovery; no source evidence of backend behavior is assumed

| ID | Mobile-origin route / required Web surface | Build status | Source finding / boundary | Required completion definition |
|---|---|---|---|---|
| PM-020 | `ai-assistant` | BUILD | No corresponding localized Web discovery/payment/support surface or CTA found. Evidence: audit-artifacts/gap-closure-audit/patient-web-manual-evidence/GENERAL_DISCOVERY_PAYMENT_SUPPORT_MANUAL_REVIEW_2026-08-26.md | CTA→contract→authz→authoritative data→all state branches→tests/runtime/ops evidence. |

### 3.articles — `P1` — Content

**Required journey scenario:** draft → clinical/editorial review → publish → update/unpublish → moderation/SEO lifecycle

| ID | Mobile-origin route / required Web surface | Build status | Source finding / boundary | Required completion definition |
|---|---|---|---|---|
| PM-029 | `articles/bookmarks` | COMPLETE_OR_REPLACE | Protected bookmark list/detail handoff exists but no bookmark mutation/note/share CTA. Evidence: audit-artifacts/gap-closure-audit/patient-web-manual-evidence/FINAL_ONBOARDING_DIAGNOSTICS_HEALTH_ROOT_MANUAL_REVIEW_2026-08-26.md | CTA→contract→authz→authoritative data→all state branches→tests/runtime/ops evidence. |
| PM-030 | `articles/index` | COMPLETE_OR_REPLACE | Public article search/category/detail handoff exists; content completeness and clinical governance are unproven. Evidence: audit-artifacts/gap-closure-audit/patient-web-manual-evidence/PHI_CONTENT_NOTIFICATIONS_CHAT_MENTAL_HEALTH_MANUAL_REVIEW_2026-08-26.md | CTA→contract→authz→authoritative data→all state branches→tests/runtime/ops evidence. |

### 3.community — `P1` — Community

**Required journey scenario:** identity/policy → create → moderation/report/block → publish/remove → audit

| ID | Mobile-origin route / required Web surface | Build status | Source finding / boundary | Required completion definition |
|---|---|---|---|---|
| PM-031 | `community/hub` | BUILD | No corresponding localized Web discovery/payment/support surface or CTA found. Evidence: audit-artifacts/gap-closure-audit/patient-web-manual-evidence/GENERAL_DISCOVERY_PAYMENT_SUPPORT_MANUAL_REVIEW_2026-08-26.md | CTA→contract→authz→authoritative data→all state branches→tests/runtime/ops evidence. |
| PM-032 | `community/post-detail` | BUILD | No corresponding localized Web discovery/payment/support surface or CTA found. Evidence: audit-artifacts/gap-closure-audit/patient-web-manual-evidence/GENERAL_DISCOVERY_PAYMENT_SUPPORT_MANUAL_REVIEW_2026-08-26.md | CTA→contract→authz→authoritative data→all state branches→tests/runtime/ops evidence. |

### 3.consultations — `P0` — Unified booking

**Required journey scenario:** discover → provider → slot hold → quote → cash/card OR insurance decision → co-pay → confirmation → delivery/call → post-care

| ID | Mobile-origin route / required Web surface | Build status | Source finding / boundary | Required completion definition |
|---|---|---|---|---|
| PM-033 | `consultations/appointment-detail` | COMPLETE_OR_REPLACE | Protected appointment detail supports limited consultation actions; payment/insurance/provider ownership and lifecycle remain unresolved. Evidence: audit-artifacts/gap-closure-audit/patient-web-manual-evidence/CONSULTATION_BOOKING_DIAGNOSTICS_HOME_CARE_MANUAL_ | CTA→contract→authz→authoritative data→all state branches→tests/runtime/ops evidence. |
| PM-034 | `consultations/appointments` | COMPLETE_OR_REPLACE | Appointment list is post-booking read surface with client status buckets; it is not consultation discovery or lifecycle authority. Evidence: audit-artifacts/gap-closure-audit/patient-web-manual-evidence/CONSULTATION_BOOKING_DIAGNOSTICS_HOME_CARE_MANUAL_REVIEW_ | CTA→contract→authz→authoritative data→all state branches→tests/runtime/ops evidence. |
| PM-035 | `consultations/book/[id]` | COMPLETE_OR_REPLACE | Booking request carries doctor/type/slot and idempotency only; cash/card-before-confirmation and insurance flow are not evidenced. Evidence: audit-artifacts/gap-closure-audit/patient-web-manual-evidence/CONSULTATION_BOOKING_DIAGNOSTICS_HOME_CARE_MANUAL_REVIEW_ | CTA→contract→authz→authoritative data→all state branches→tests/runtime/ops evidence. |
| PM-036 | `consultations/booking-confirm` | BUILD | No dedicated Web consultation confirmation surface or receipt/payment completion state was located; booking redirects to generic appointment detail. Evidence: audit-artifacts/gap-closure-audit/patient-web-manual-evidence/CONSULTATION_BOOKING_DIAGNOSTICS_HOME_C | CTA→contract→authz→authoritative data→all state branches→tests/runtime/ops evidence. |
| PM-037 | `consultations/booking-pending` | BUILD | No dedicated Web consultation pending/insurance/payment state surface was located; generic appointment detail does not provide required decision/payment transitions. Evidence: audit-artifacts/gap-closure-audit/patient-web-manual-evidence/CONSULTATION_BOOKING_D | CTA→contract→authz→authoritative data→all state branches→tests/runtime/ops evidence. |
| PM-038 | `consultations/booking-success` | BUILD | No dedicated Web consultation success/receipt surface or verified payment-confirmation state was located. Evidence: audit-artifacts/gap-closure-audit/patient-web-manual-evidence/CONSULTATION_BOOKING_DIAGNOSTICS_HOME_CARE_MANUAL_REVIEW_2026-08-26.md | CTA→contract→authz→authoritative data→all state branches→tests/runtime/ops evidence. |
| PM-039 | `consultations/call-history` | BUILD | No call-history Web surface found. Evidence: audit-artifacts/gap-closure-audit/patient-web-manual-evidence/CONSULTATION_FOLLOWUP_CALL_POSTCARE_MANUAL_REVIEW_2026-08-26.md | CTA→contract→authz→authoritative data→all state branches→tests/runtime/ops evidence. |
| PM-040 | `consultations/cancel-reschedule` | COMPLETE_OR_REPLACE | Consultation-only cancel/reschedule uses local datetime input and idempotency; no authoritative slot picker, financial or payer lifecycle is evidenced. Evidence: audit-artifacts/gap-closure-audit/patient-web-manual-evidence/CONSULTATION_BOOKING_DIAGNOSTICS_HOM | CTA→contract→authz→authoritative data→all state branches→tests/runtime/ops evidence. |
| PM-041 | `consultations/chat-with-doctor` | BUILD | Thread surface renders summary metadata and hides body; no compose/reply/upload/escalation CTA is evidenced. Evidence: audit-artifacts/gap-closure-audit/patient-web-manual-evidence/PHI_CONTENT_NOTIFICATIONS_CHAT_MENTAL_HEALTH_MANUAL_REVIEW_2026-08-26.md | CTA→contract→authz→authoritative data→all state branches→tests/runtime/ops evidence. |
| PM-042 | `consultations/clinic-confirm` | BUILD | No clinic-confirmation Web surface found. Evidence: audit-artifacts/gap-closure-audit/patient-web-manual-evidence/CONSULTATION_FOLLOWUP_CALL_POSTCARE_MANUAL_REVIEW_2026-08-26.md | CTA→contract→authz→authoritative data→all state branches→tests/runtime/ops evidence. |
| PM-043 | `consultations/clinic-location` | BUILD | No clinic-location Web surface found. Evidence: audit-artifacts/gap-closure-audit/patient-web-manual-evidence/CONSULTATION_FOLLOWUP_CALL_POSTCARE_MANUAL_REVIEW_2026-08-26.md | CTA→contract→authz→authoritative data→all state branches→tests/runtime/ops evidence. |
| PM-044 | `consultations/clinic/[id]` | BUILD | No clinic-detail Web surface found. Evidence: audit-artifacts/gap-closure-audit/patient-web-manual-evidence/CONSULTATION_FOLLOWUP_CALL_POSTCARE_MANUAL_REVIEW_2026-08-26.md | CTA→contract→authz→authoritative data→all state branches→tests/runtime/ops evidence. |
| PM-045 | `consultations/doctor-profile` | COMPLETE_OR_REPLACE | Public doctor detail and slots exist; pricing/coverage/provider availability authority remains unproven. Evidence: audit-artifacts/gap-closure-audit/patient-web-manual-evidence/CONSULTATION_BOOKING_DIAGNOSTICS_HOME_CARE_MANUAL_REVIEW_2026-08-26.md | CTA→contract→authz→authoritative data→all state branches→tests/runtime/ops evidence. |
| PM-046 | `consultations/doctor-search` | COMPLETE_OR_REPLACE | Public doctor search/sort/detail handoff exists; price/availability/insurance authority and full booking lifecycle remain unproven. Evidence: audit-artifacts/gap-closure-audit/patient-web-manual-evidence/CONSULTATION_FOLLOWUP_CALL_POSTCARE_MANUAL_REVIEW_2026-0 | CTA→contract→authz→authoritative data→all state branches→tests/runtime/ops evidence. |
| PM-047 | `consultations/doctor/[id]` | COMPLETE_OR_REPLACE | Public doctor detail and slots exist; pricing/coverage/provider availability authority remains unproven. Evidence: audit-artifacts/gap-closure-audit/patient-web-manual-evidence/CONSULTATION_BOOKING_DIAGNOSTICS_HOME_CARE_MANUAL_REVIEW_2026-08-26.md | CTA→contract→authz→authoritative data→all state branches→tests/runtime/ops evidence. |
| PM-048 | `consultations/follow-up` | BUILD | No consultation follow-up Web surface found. Evidence: audit-artifacts/gap-closure-audit/patient-web-manual-evidence/CONSULTATION_FOLLOWUP_CALL_POSTCARE_MANUAL_REVIEW_2026-08-26.md | CTA→contract→authz→authoritative data→all state branches→tests/runtime/ops evidence. |
| PM-049 | `consultations/home-visit-tracking` | BUILD | No home-visit tracking Web surface found. Evidence: audit-artifacts/gap-closure-audit/patient-web-manual-evidence/CONSULTATION_FOLLOWUP_CALL_POSTCARE_MANUAL_REVIEW_2026-08-26.md | CTA→contract→authz→authoritative data→all state branches→tests/runtime/ops evidence. |
| PM-050 | `consultations/incoming-call` | BUILD | No incoming-call Web surface found. Evidence: audit-artifacts/gap-closure-audit/patient-web-manual-evidence/CONSULTATION_FOLLOWUP_CALL_POSTCARE_MANUAL_REVIEW_2026-08-26.md | CTA→contract→authz→authoritative data→all state branches→tests/runtime/ops evidence. |
| PM-051 | `consultations/offer/[id]` | BUILD | No consultation-offer Web surface found. Evidence: audit-artifacts/gap-closure-audit/patient-web-manual-evidence/CONSULTATION_FOLLOWUP_CALL_POSTCARE_MANUAL_REVIEW_2026-08-26.md | CTA→contract→authz→authoritative data→all state branches→tests/runtime/ops evidence. |
| PM-052 | `consultations/post-call-rating` | BUILD | No post-call rating Web surface found. Evidence: audit-artifacts/gap-closure-audit/patient-web-manual-evidence/CONSULTATION_FOLLOWUP_CALL_POSTCARE_MANUAL_REVIEW_2026-08-26.md | CTA→contract→authz→authoritative data→all state branches→tests/runtime/ops evidence. |
| PM-053 | `consultations/prescription-from-doctor` | BUILD | No consultation prescription Web surface found. Evidence: audit-artifacts/gap-closure-audit/patient-web-manual-evidence/CONSULTATION_FOLLOWUP_CALL_POSTCARE_MANUAL_REVIEW_2026-08-26.md | CTA→contract→authz→authoritative data→all state branches→tests/runtime/ops evidence. |
| PM-054 | `consultations/share-report` | BUILD | No consultation report-share Web surface found. Evidence: audit-artifacts/gap-closure-audit/patient-web-manual-evidence/CONSULTATION_FOLLOWUP_CALL_POSTCARE_MANUAL_REVIEW_2026-08-26.md | CTA→contract→authz→authoritative data→all state branches→tests/runtime/ops evidence. |
| PM-056 | `consultations/summary` | BUILD | No consultation summary Web surface found. Evidence: audit-artifacts/gap-closure-audit/patient-web-manual-evidence/CONSULTATION_FOLLOWUP_CALL_POSTCARE_MANUAL_REVIEW_2026-08-26.md | CTA→contract→authz→authoritative data→all state branches→tests/runtime/ops evidence. |
| PM-057 | `consultations/video-call` | COMPLETE_OR_REPLACE | Video path requests a call token and shows local ready/error only; it does not join or manage a call lifecycle. Evidence: audit-artifacts/gap-closure-audit/patient-web-manual-evidence/CONSULTATION_BOOKING_DIAGNOSTICS_HOME_CARE_MANUAL_REVIEW_2026-08-26.md | CTA→contract→authz→authoritative data→all state branches→tests/runtime/ops evidence. |
| PM-058 | `consultations/video/[id]` | BUILD | No video-room Web surface found; token readiness alone is not room join. Evidence: audit-artifacts/gap-closure-audit/patient-web-manual-evidence/CONSULTATION_FOLLOWUP_CALL_POSTCARE_MANUAL_REVIEW_2026-08-26.md | CTA→contract→authz→authoritative data→all state branches→tests/runtime/ops evidence. |
| PM-059 | `consultations/virtual-waiting-room` | BUILD | No virtual-waiting-room Web surface found. Evidence: audit-artifacts/gap-closure-audit/patient-web-manual-evidence/CONSULTATION_FOLLOWUP_CALL_POSTCARE_MANUAL_REVIEW_2026-08-26.md | CTA→contract→authz→authoritative data→all state branches→tests/runtime/ops evidence. |
| PM-060 | `consultations/waiting-room` | BUILD | No waiting-room Web surface found. Evidence: audit-artifacts/gap-closure-audit/patient-web-manual-evidence/CONSULTATION_FOLLOWUP_CALL_POSTCARE_MANUAL_REVIEW_2026-08-26.md | CTA→contract→authz→authoritative data→all state branches→tests/runtime/ops evidence. |

### 3.dashboard — `P1` — Cross-cutting / source reconciliation

**Required journey scenario:** complete exact CTA → contract → authz → authoritative data → real result/error/recovery; no source evidence of backend behavior is assumed

| ID | Mobile-origin route / required Web surface | Build status | Source finding / boundary | Required completion definition |
|---|---|---|---|---|
| PM-013 | `(tabs)/consultations/index` | COMPLETE_OR_REPLACE | Public doctor/slot discovery mounts an idempotent booking form, but price/payment/insurance/provider decision are not evidenced. Evidence: audit-artifacts/gap-closure-audit/patient-web-manual-evidence/CONSULTATION_BOOKING_DIAGNOSTICS_HOME_CARE_MANUAL_REVIEW_20 | CTA→contract→authz→authoritative data→all state branches→tests/runtime/ops evidence. |
| PM-015 | `(tabs)/health` | COMPLETE_OR_REPLACE | Authenticated vital summary and navigation exist; provenance, edit/import/share and clinical escalation are not evidenced. Evidence: audit-artifacts/gap-closure-audit/patient-web-manual-evidence/PHI_CONTENT_NOTIFICATIONS_CHAT_MENTAL_HEALTH_MANUAL_REVIEW_2026-0 | CTA→contract→authz→authoritative data→all state branches→tests/runtime/ops evidence. |
| PM-016 | `(tabs)/index` | COMPLETE_OR_REPLACE | Protected navigation hub exists but does not prove Mobile tab aggregate behavior. Evidence: audit-artifacts/gap-closure-audit/patient-web-manual-evidence/FINAL_ONBOARDING_DIAGNOSTICS_HEALTH_ROOT_MANUAL_REVIEW_2026-08-26.md | CTA→contract→authz→authoritative data→all state branches→tests/runtime/ops evidence. |
| PM-017 | `(tabs)/nursing` | BUILD | No nursing-specific Web service/profile/tracking workflow was located; home-care catalog does not evidence nursing booking/fulfillment. Evidence: audit-artifacts/gap-closure-audit/patient-web-manual-evidence/CONSULTATION_BOOKING_DIAGNOSTICS_HOME_CARE_MANUAL_RE | CTA→contract→authz→authoritative data→all state branches→tests/runtime/ops evidence. |
| PM-018 | `(tabs)/pharmacy` | COMPLETE_OR_REPLACE | Authenticated medicine discovery/search and detail handoff exist, but no pharmacy cart/offer/payment journey CTA is present. Evidence: audit-artifacts/gap-closure-audit/patient-web-manual-evidence/PHARMACY_CART_OFFERS_PAYMENT_ORDERS_MANUAL_REVIEW_2026-08-26.md | CTA→contract→authz→authoritative data→all state branches→tests/runtime/ops evidence. |

### 3.delivery — `P1` — Cross-cutting / source reconciliation

**Required journey scenario:** complete exact CTA → contract → authz → authoritative data → real result/error/recovery; no source evidence of backend behavior is assumed

| ID | Mobile-origin route / required Web surface | Build status | Source finding / boundary | Required completion definition |
|---|---|---|---|---|
| PM-061 | `delivery/address-select` | BUILD | No corresponding localized Web discovery/payment/support surface or CTA found. Evidence: audit-artifacts/gap-closure-audit/patient-web-manual-evidence/GENERAL_DISCOVERY_PAYMENT_SUPPORT_MANUAL_REVIEW_2026-08-26.md | CTA→contract→authz→authoritative data→all state branches→tests/runtime/ops evidence. |

### 3.diagnostics — `P0` — Unified booking + results

**Required journey scenario:** catalog → provider/slot/home eligibility → hold/quote → payment/insurance → confirmation → collection/scan → signed result → support

| ID | Mobile-origin route / required Web surface | Build status | Source finding / boundary | Required completion definition |
|---|---|---|---|---|
| PM-014 | `(tabs)/diagnostics` | BUILD | Public labs discovery is static card/filter UI; no booking, payment, insurance, provider or result transition is evidenced. Evidence: audit-artifacts/gap-closure-audit/patient-web-manual-evidence/CONSULTATION_BOOKING_DIAGNOSTICS_HOME_CARE_MANUAL_REVIEW_2026-08 | CTA→contract→authz→authoritative data→all state branches→tests/runtime/ops evidence. |
| PM-062 | `diagnostics/book-sample` | BUILD | No Web diagnostic sample-booking creation surface or mutation handler was located in reviewed source. Evidence: audit-artifacts/gap-closure-audit/patient-web-manual-evidence/CONSULTATION_BOOKING_DIAGNOSTICS_HOME_CARE_MANUAL_REVIEW_2026-08-26.md | CTA→contract→authz→authoritative data→all state branches→tests/runtime/ops evidence. |
| PM-063 | `diagnostics/booking-confirm` | BUILD | No Web diagnostic booking confirmation surface or payment/insurance completion state was located. Evidence: audit-artifacts/gap-closure-audit/patient-web-manual-evidence/CONSULTATION_BOOKING_DIAGNOSTICS_HOME_CARE_MANUAL_REVIEW_2026-08-26.md | CTA→contract→authz→authoritative data→all state branches→tests/runtime/ops evidence. |
| PM-064 | `diagnostics/booking-success` | BUILD | No Web diagnostic booking success/receipt surface was located. Evidence: audit-artifacts/gap-closure-audit/patient-web-manual-evidence/CONSULTATION_BOOKING_DIAGNOSTICS_HOME_CARE_MANUAL_REVIEW_2026-08-26.md | CTA→contract→authz→authoritative data→all state branches→tests/runtime/ops evidence. |
| PM-065 | `diagnostics/cart` | BUILD | No Web diagnostic cart surface or diagnostic-cart mutation flow was located. Evidence: audit-artifacts/gap-closure-audit/patient-web-manual-evidence/CONSULTATION_BOOKING_DIAGNOSTICS_HOME_CARE_MANUAL_REVIEW_2026-08-26.md | CTA→contract→authz→authoritative data→all state branches→tests/runtime/ops evidence. |
| PM-066 | `diagnostics/checkout` | BUILD | No Web diagnostic checkout/payment surface or mutation handler was located. Evidence: audit-artifacts/gap-closure-audit/patient-web-manual-evidence/CONSULTATION_BOOKING_DIAGNOSTICS_HOME_CARE_MANUAL_REVIEW_2026-08-26.md | CTA→contract→authz→authoritative data→all state branches→tests/runtime/ops evidence. |
| PM-067 | `diagnostics/insurance-approval` | BUILD | No Web diagnostic insurance-approval or co-pay decision surface was located. Evidence: audit-artifacts/gap-closure-audit/patient-web-manual-evidence/CONSULTATION_BOOKING_DIAGNOSTICS_HOME_CARE_MANUAL_REVIEW_2026-08-26.md | CTA→contract→authz→authoritative data→all state branches→tests/runtime/ops evidence. |
| PM-068 | `diagnostics/insurance-upload` | BUILD | No Web diagnostic insurance-upload surface or associated mutation was located. Evidence: audit-artifacts/gap-closure-audit/patient-web-manual-evidence/CONSULTATION_BOOKING_DIAGNOSTICS_HOME_CARE_MANUAL_REVIEW_2026-08-26.md | CTA→contract→authz→authoritative data→all state branches→tests/runtime/ops evidence. |
| PM-069 | `diagnostics/lab-comparison` | BUILD | No diagnostic comparison route/CTA found. Evidence: audit-artifacts/gap-closure-audit/patient-web-manual-evidence/FINAL_ONBOARDING_DIAGNOSTICS_HEALTH_ROOT_MANUAL_REVIEW_2026-08-26.md | CTA→contract→authz→authoritative data→all state branches→tests/runtime/ops evidence. |
| PM-070 | `diagnostics/lab/[id]` | BUILD | Lab discovery cards are static and no Web lab-detail/booking route was located in reviewed source. Evidence: audit-artifacts/gap-closure-audit/patient-web-manual-evidence/CONSULTATION_BOOKING_DIAGNOSTICS_HOME_CARE_MANUAL_REVIEW_2026-08-26.md | CTA→contract→authz→authoritative data→all state branches→tests/runtime/ops evidence. |
| PM-071 | `diagnostics/my-results` | COMPLETE_OR_REPLACE | Diagnostic booking dashboard exposes state/schedule/report-ready badge only; no result content/download. Evidence: audit-artifacts/gap-closure-audit/patient-web-manual-evidence/FINAL_ONBOARDING_DIAGNOSTICS_HEALTH_ROOT_MANUAL_REVIEW_2026-08-26.md | CTA→contract→authz→authoritative data→all state branches→tests/runtime/ops evidence. |
| PM-072 | `diagnostics/order/[id]` | COMPLETE_OR_REPLACE | Protected diagnostic booking read exists; no payment/insurance/cancel/result/provider workflow CTA is evidenced. Evidence: audit-artifacts/gap-closure-audit/patient-web-manual-evidence/CONSULTATION_BOOKING_DIAGNOSTICS_HOME_CARE_MANUAL_REVIEW_2026-08-26.md | CTA→contract→authz→authoritative data→all state branches→tests/runtime/ops evidence. |
| PM-073 | `diagnostics/orders` | COMPLETE_OR_REPLACE | Diagnostic booking dashboard exposes read-only states; no order action workflow. Evidence: audit-artifacts/gap-closure-audit/patient-web-manual-evidence/FINAL_ONBOARDING_DIAGNOSTICS_HEALTH_ROOT_MANUAL_REVIEW_2026-08-26.md | CTA→contract→authz→authoritative data→all state branches→tests/runtime/ops evidence. |
| PM-074 | `diagnostics/package-detail` | COMPLETE_OR_REPLACE | Public package detail is catalog-only with no booking/payment/insurance CTA. Evidence: audit-artifacts/gap-closure-audit/patient-web-manual-evidence/FINAL_ONBOARDING_DIAGNOSTICS_HEALTH_ROOT_MANUAL_REVIEW_2026-08-26.md | CTA→contract→authz→authoritative data→all state branches→tests/runtime/ops evidence. |
| PM-075 | `diagnostics/packages` | COMPLETE_OR_REPLACE | Public lab-package discovery/detail handoff exists but no booking, insurance, payment or confirmation transition is evidenced. Evidence: audit-artifacts/gap-closure-audit/patient-web-manual-evidence/CONSULTATION_BOOKING_DIAGNOSTICS_HOME_CARE_MANUAL_REVIEW_2026 | CTA→contract→authz→authoritative data→all state branches→tests/runtime/ops evidence. |
| PM-076 | `diagnostics/results-history` | COMPLETE_OR_REPLACE | Diagnostic booking dashboard exposes report-ready badge only; no result-history/content/download. Evidence: audit-artifacts/gap-closure-audit/patient-web-manual-evidence/FINAL_ONBOARDING_DIAGNOSTICS_HEALTH_ROOT_MANUAL_REVIEW_2026-08-26.md | CTA→contract→authz→authoritative data→all state branches→tests/runtime/ops evidence. |
| PM-077 | `diagnostics/sample-tracking` | COMPLETE_OR_REPLACE | Diagnostic status/schedule/location read exists; no sample/technician tracking state or communication CTA is evidenced. Evidence: audit-artifacts/gap-closure-audit/patient-web-manual-evidence/CONSULTATION_BOOKING_DIAGNOSTICS_HOME_CARE_MANUAL_REVIEW_2026-08-26. | CTA→contract→authz→authoritative data→all state branches→tests/runtime/ops evidence. |
| PM-078 | `diagnostics/search` | BUILD | Lab search/filter display exists but does not transition to diagnostic booking/payment/insurance flow. Evidence: audit-artifacts/gap-closure-audit/patient-web-manual-evidence/CONSULTATION_BOOKING_DIAGNOSTICS_HOME_CARE_MANUAL_REVIEW_2026-08-26.md | CTA→contract→authz→authoritative data→all state branches→tests/runtime/ops evidence. |
| PM-079 | `diagnostics/technician-tracking` | BUILD | No Web diagnostic technician-tracking surface was located in reviewed source. Evidence: audit-artifacts/gap-closure-audit/patient-web-manual-evidence/CONSULTATION_BOOKING_DIAGNOSTICS_HOME_CARE_MANUAL_REVIEW_2026-08-26.md | CTA→contract→authz→authoritative data→all state branches→tests/runtime/ops evidence. |
| PM-080 | `diagnostics/test-detail` | BUILD | No Web diagnostic test-detail/booking surface was located; labs cards have no detail link. Evidence: audit-artifacts/gap-closure-audit/patient-web-manual-evidence/CONSULTATION_BOOKING_DIAGNOSTICS_HOME_CARE_MANUAL_REVIEW_2026-08-26.md | CTA→contract→authz→authoritative data→all state branches→tests/runtime/ops evidence. |
| PM-081 | `diagnostics/upload-rx` | BUILD | No Web diagnostic referral/prescription upload surface or mutation was located. Evidence: audit-artifacts/gap-closure-audit/patient-web-manual-evidence/CONSULTATION_BOOKING_DIAGNOSTICS_HOME_CARE_MANUAL_REVIEW_2026-08-26.md | CTA→contract→authz→authoritative data→all state branches→tests/runtime/ops evidence. |

### 3.drug-scanner — `P1-SAFETY` — Drug scanning

**Required journey scenario:** camera permission → authoritative barcode/Rx lookup → confidence/unknown → pharmacist/clinical safe fallback

| ID | Mobile-origin route / required Web surface | Build status | Source finding / boundary | Required completion definition |
|---|---|---|---|---|
| PM-082 | `drug-scanner/index` | BUILD | No corresponding localized Web discovery/payment/support surface or CTA found. Evidence: audit-artifacts/gap-closure-audit/patient-web-manual-evidence/GENERAL_DISCOVERY_PAYMENT_SUPPORT_MANUAL_REVIEW_2026-08-26.md | CTA→contract→authz→authoritative data→all state branches→tests/runtime/ops evidence. |

### 3.emergency — `P0-SAFETY` — Emergency

**Required journey scenario:** only after jurisdiction SOP: consent/location → dispatch/escalation → acknowledgement → failure/false-alarm handling → audit

| ID | Mobile-origin route / required Web surface | Build status | Source finding / boundary | Required completion definition |
|---|---|---|---|---|
| PM-083 | `emergency/index` | BUILD | No localized Web emergency feature surface/CTA found. Evidence: audit-artifacts/gap-closure-audit/patient-web-manual-evidence/AI_EMERGENCY_WALLET_LOYALTY_RETURNS_MANUAL_REVIEW_2026-08-26.md | CTA→contract→authz→authoritative data→all state branches→tests/runtime/ops evidence. |
| PM-084 | `emergency/sos-active` | BUILD | No localized Web emergency feature surface/CTA found. Evidence: audit-artifacts/gap-closure-audit/patient-web-manual-evidence/AI_EMERGENCY_WALLET_LOYALTY_RETURNS_MANUAL_REVIEW_2026-08-26.md | CTA→contract→authz→authoritative data→all state branches→tests/runtime/ops evidence. |
| PM-085 | `emergency/sos` | BUILD | No localized Web emergency feature surface/CTA found. Evidence: audit-artifacts/gap-closure-audit/patient-web-manual-evidence/AI_EMERGENCY_WALLET_LOYALTY_RETURNS_MANUAL_REVIEW_2026-08-26.md | CTA→contract→authz→authoritative data→all state branches→tests/runtime/ops evidence. |
| PM-086 | `emergency/tracking` | BUILD | No localized Web emergency feature surface/CTA found. Evidence: audit-artifacts/gap-closure-audit/patient-web-manual-evidence/AI_EMERGENCY_WALLET_LOYALTY_RETURNS_MANUAL_REVIEW_2026-08-26.md | CTA→contract→authz→authoritative data→all state branches→tests/runtime/ops evidence. |

### 3.family — `P0` — Family delegation

**Required journey scenario:** invite → accept → scoped permission/time limit → audited resource access → revoke/expiry

| ID | Mobile-origin route / required Web surface | Build status | Source finding / boundary | Required completion definition |
|---|---|---|---|---|
| PM-087 | `family/calendar` | BUILD | No family calendar or care-coordination action surface found. Evidence: audit-artifacts/gap-closure-audit/patient-web-manual-evidence/FAMILY_MANAGEMENT_DELEGATION_MANUAL_REVIEW_2026-08-26.md | CTA→contract→authz→authoritative data→all state branches→tests/runtime/ops evidence. |
| PM-088 | `family/chat` | BUILD | No family-chat route or CTA found; family list is summary-only. Evidence: audit-artifacts/gap-closure-audit/patient-web-manual-evidence/FAMILY_MANAGEMENT_DELEGATION_MANUAL_REVIEW_2026-08-26.md | CTA→contract→authz→authoritative data→all state branches→tests/runtime/ops evidence. |
| PM-089 | `family/emergency-contacts` | BUILD | No family emergency contacts action surface found. Evidence: audit-artifacts/gap-closure-audit/patient-web-manual-evidence/FAMILY_MANAGEMENT_DELEGATION_MANUAL_REVIEW_2026-08-26.md | CTA→contract→authz→authoritative data→all state branches→tests/runtime/ops evidence. |
| PM-090 | `family/hub` | COMPLETE_OR_REPLACE | Family surface is membership summary only, not a family hub workflow. Evidence: audit-artifacts/gap-closure-audit/patient-web-manual-evidence/FAMILY_MANAGEMENT_DELEGATION_MANUAL_REVIEW_2026-08-26.md | CTA→contract→authz→authoritative data→all state branches→tests/runtime/ops evidence. |
| PM-091 | `family/index` | COMPLETE_OR_REPLACE | Family surface is membership summary only, not a member-management workflow. Evidence: audit-artifacts/gap-closure-audit/patient-web-manual-evidence/FAMILY_MANAGEMENT_DELEGATION_MANUAL_REVIEW_2026-08-26.md | CTA→contract→authz→authoritative data→all state branches→tests/runtime/ops evidence. |
| PM-092 | `family/invite` | BUILD | No invite-member form or mutation exists in reviewed family source. Evidence: audit-artifacts/gap-closure-audit/patient-web-manual-evidence/FAMILY_MANAGEMENT_DELEGATION_MANUAL_REVIEW_2026-08-26.md | CTA→contract→authz→authoritative data→all state branches→tests/runtime/ops evidence. |
| PM-093 | `family/join` | BUILD | No family join/acceptance route or mutation exists in reviewed family source. Evidence: audit-artifacts/gap-closure-audit/patient-web-manual-evidence/FAMILY_MANAGEMENT_DELEGATION_MANUAL_REVIEW_2026-08-26.md | CTA→contract→authz→authoritative data→all state branches→tests/runtime/ops evidence. |
| PM-094 | `family/member-health` | BUILD | Family cards are non-linked summaries; no delegated health-detail surface found. Evidence: audit-artifacts/gap-closure-audit/patient-web-manual-evidence/FAMILY_MANAGEMENT_DELEGATION_MANUAL_REVIEW_2026-08-26.md | CTA→contract→authz→authoritative data→all state branches→tests/runtime/ops evidence. |
| PM-095 | `family/permission-request` | BUILD | No family permission-request route or mutation exists in reviewed family source. Evidence: audit-artifacts/gap-closure-audit/patient-web-manual-evidence/FAMILY_MANAGEMENT_DELEGATION_MANUAL_REVIEW_2026-08-26.md | CTA→contract→authz→authoritative data→all state branches→tests/runtime/ops evidence. |
| PM-096 | `family/permissions` | BUILD | No family permission grant/revoke management route exists in reviewed family source. Evidence: audit-artifacts/gap-closure-audit/patient-web-manual-evidence/FAMILY_MANAGEMENT_DELEGATION_MANUAL_REVIEW_2026-08-26.md | CTA→contract→authz→authoritative data→all state branches→tests/runtime/ops evidence. |
| PM-097 | `family/scan` | BUILD | No family QR/scan route or CTA exists in reviewed family source. Evidence: audit-artifacts/gap-closure-audit/patient-web-manual-evidence/FAMILY_MANAGEMENT_DELEGATION_MANUAL_REVIEW_2026-08-26.md | CTA→contract→authz→authoritative data→all state branches→tests/runtime/ops evidence. |
| PM-098 | `family/shared-calendar` | BUILD | No family shared-calendar action surface found. Evidence: audit-artifacts/gap-closure-audit/patient-web-manual-evidence/FAMILY_MANAGEMENT_DELEGATION_MANUAL_REVIEW_2026-08-26.md | CTA→contract→authz→authoritative data→all state branches→tests/runtime/ops evidence. |

### 3.health — `P1` — PHI workspace

**Required journey scenario:** authorized read/edit boundary → provenance/freshness → consent/delegation/audit → notifications/escalation when clinically appropriate

| ID | Mobile-origin route / required Web surface | Build status | Source finding / boundary | Required completion definition |
|---|---|---|---|---|
| PM-099 | `health/actionable-order` | BUILD | No health actionable-order surface found. Evidence: audit-artifacts/gap-closure-audit/patient-web-manual-evidence/FINAL_ONBOARDING_DIAGNOSTICS_HEALTH_ROOT_MANUAL_REVIEW_2026-08-26.md | CTA→contract→authz→authoritative data→all state branches→tests/runtime/ops evidence. |
| PM-100 | `health/add-family-member` | BUILD | No add/invite-member form or mutation exists in reviewed family source. Evidence: audit-artifacts/gap-closure-audit/patient-web-manual-evidence/FAMILY_MANAGEMENT_DELEGATION_MANUAL_REVIEW_2026-08-26.md | CTA→contract→authz→authoritative data→all state branches→tests/runtime/ops evidence. |
| PM-101 | `health/chronic-disease` | COMPLETE_OR_REPLACE | Protected condition read exists but no add/edit/remove or clinical-review CTA is evidenced. Evidence: audit-artifacts/gap-closure-audit/patient-web-manual-evidence/HEALTH_READ_SUMMARIES_MANUAL_REVIEW_2026-08-26.md | CTA→contract→authz→authoritative data→all state branches→tests/runtime/ops evidence. |
| PM-102 | `health/chronic-medications` | COMPLETE_OR_REPLACE | Protected chronic-medication/refill facts exist but no adherence/refill/update/prescribing CTA is evidenced. Evidence: audit-artifacts/gap-closure-audit/patient-web-manual-evidence/HEALTH_READ_SUMMARIES_MANUAL_REVIEW_2026-08-26.md | CTA→contract→authz→authoritative data→all state branches→tests/runtime/ops evidence. |
| PM-103 | `health/conditions-allergies` | BUILD | No health conditions/allergies management surface found. Evidence: audit-artifacts/gap-closure-audit/patient-web-manual-evidence/FINAL_ONBOARDING_DIAGNOSTICS_HEALTH_ROOT_MANUAL_REVIEW_2026-08-26.md | CTA→contract→authz→authoritative data→all state branches→tests/runtime/ops evidence. |
| PM-104 | `health/edit-profile` | BUILD | Profile is display-only; no health edit profile mutation surface found. Evidence: audit-artifacts/gap-closure-audit/patient-web-manual-evidence/FINAL_ONBOARDING_DIAGNOSTICS_HEALTH_ROOT_MANUAL_REVIEW_2026-08-26.md | CTA→contract→authz→authoritative data→all state branches→tests/runtime/ops evidence. |
| PM-105 | `health/emergency-contacts` | COMPLETE_OR_REPLACE | Masked emergency contacts are read-only; no add/edit/delete/call/escalation CTA is evidenced. Evidence: audit-artifacts/gap-closure-audit/patient-web-manual-evidence/HEALTH_READ_SUMMARIES_MANUAL_REVIEW_2026-08-26.md | CTA→contract→authz→authoritative data→all state branches→tests/runtime/ops evidence. |
| PM-106 | `health/family-calendar` | BUILD | No family calendar or care-coordination action surface found. Evidence: audit-artifacts/gap-closure-audit/patient-web-manual-evidence/FAMILY_MANAGEMENT_DELEGATION_MANUAL_REVIEW_2026-08-26.md | CTA→contract→authz→authoritative data→all state branches→tests/runtime/ops evidence. |
| PM-107 | `health/family-chat` | BUILD | No family-chat route or CTA found; family list is summary-only. Evidence: audit-artifacts/gap-closure-audit/patient-web-manual-evidence/FAMILY_MANAGEMENT_DELEGATION_MANUAL_REVIEW_2026-08-26.md | CTA→contract→authz→authoritative data→all state branches→tests/runtime/ops evidence. |
| PM-108 | `health/family-hub` | COMPLETE_OR_REPLACE | Family surface is membership summary only, not a family hub workflow. Evidence: audit-artifacts/gap-closure-audit/patient-web-manual-evidence/FAMILY_MANAGEMENT_DELEGATION_MANUAL_REVIEW_2026-08-26.md | CTA→contract→authz→authoritative data→all state branches→tests/runtime/ops evidence. |
| PM-109 | `health/family-member-detail` | BUILD | Family cards are non-linked summaries; no member-detail/delegated-health surface found. Evidence: audit-artifacts/gap-closure-audit/patient-web-manual-evidence/FAMILY_MANAGEMENT_DELEGATION_MANUAL_REVIEW_2026-08-26.md | CTA→contract→authz→authoritative data→all state branches→tests/runtime/ops evidence. |
| PM-110 | `health/health-id` | BUILD | No health-ID surface found. Evidence: audit-artifacts/gap-closure-audit/patient-web-manual-evidence/FINAL_ONBOARDING_DIAGNOSTICS_HEALTH_ROOT_MANUAL_REVIEW_2026-08-26.md | CTA→contract→authz→authoritative data→all state branches→tests/runtime/ops evidence. |
| PM-111 | `health/medication-reminder-add` | BUILD | No reminder-creation form or mutation surface was located; reminders page is summary/list only. Evidence: audit-artifacts/gap-closure-audit/patient-web-manual-evidence/HEALTH_READ_SUMMARIES_MANUAL_REVIEW_2026-08-26.md | CTA→contract→authz→authoritative data→all state branches→tests/runtime/ops evidence. |
| PM-112 | `health/medication-reminder-list` | COMPLETE_OR_REPLACE | Protected reminder/today-dose summary exists but no mark-taken/snooze/edit/delete CTA is evidenced. Evidence: audit-artifacts/gap-closure-audit/patient-web-manual-evidence/HEALTH_READ_SUMMARIES_MANUAL_REVIEW_2026-08-26.md | CTA→contract→authz→authoritative data→all state branches→tests/runtime/ops evidence. |
| PM-113 | `health/medications` | COMPLETE_OR_REPLACE | Read-only chronic medication subset exists; no full medication management/prescribing workflow. Evidence: audit-artifacts/gap-closure-audit/patient-web-manual-evidence/FINAL_ONBOARDING_DIAGNOSTICS_HEALTH_ROOT_MANUAL_REVIEW_2026-08-26.md | CTA→contract→authz→authoritative data→all state branches→tests/runtime/ops evidence. |
| PM-114 | `health/prescriptions` | COMPLETE_OR_REPLACE | Protected prescription summaries exist but no detail/refill/share/pharmacy handoff CTA. Evidence: audit-artifacts/gap-closure-audit/patient-web-manual-evidence/FINAL_ONBOARDING_DIAGNOSTICS_HEALTH_ROOT_MANUAL_REVIEW_2026-08-26.md | CTA→contract→authz→authoritative data→all state branches→tests/runtime/ops evidence. |
| PM-115 | `health/refills` | BUILD | Optional refill date is display-only; no refill eligibility/request/pharmacy/payment workflow is evidenced. Evidence: audit-artifacts/gap-closure-audit/patient-web-manual-evidence/HEALTH_READ_SUMMARIES_MANUAL_REVIEW_2026-08-26.md | CTA→contract→authz→authoritative data→all state branches→tests/runtime/ops evidence. |
| PM-116 | `health/reminders` | COMPLETE_OR_REPLACE | Protected reminder/today-dose summary exists but no mark-taken/snooze/edit/delete CTA is evidenced. Evidence: audit-artifacts/gap-closure-audit/patient-web-manual-evidence/HEALTH_READ_SUMMARIES_MANUAL_REVIEW_2026-08-26.md | CTA→contract→authz→authoritative data→all state branches→tests/runtime/ops evidence. |
| PM-117 | `health/reports` | BUILD | Protected report summary list has no detail/download/share/provenance or clinical workflow CTA. Evidence: audit-artifacts/gap-closure-audit/patient-web-manual-evidence/PHI_CONTENT_NOTIFICATIONS_CHAT_MENTAL_HEALTH_MANUAL_REVIEW_2026-08-26.md | CTA→contract→authz→authoritative data→all state branches→tests/runtime/ops evidence. |
| PM-118 | `health/sleep-score` | COMPLETE_OR_REPLACE | Protected sleep score/history display exists but no logging/correction/device-sync/intervention CTA is evidenced. Evidence: audit-artifacts/gap-closure-audit/patient-web-manual-evidence/HEALTH_READ_SUMMARIES_MANUAL_REVIEW_2026-08-26.md | CTA→contract→authz→authoritative data→all state branches→tests/runtime/ops evidence. |
| PM-119 | `health/sleep-tracker` | COMPLETE_OR_REPLACE | Protected sleep history exists but no tracking input, device sync, correction or intervention CTA is evidenced. Evidence: audit-artifacts/gap-closure-audit/patient-web-manual-evidence/HEALTH_READ_SUMMARIES_MANUAL_REVIEW_2026-08-26.md | CTA→contract→authz→authoritative data→all state branches→tests/runtime/ops evidence. |
| PM-120 | `health/smart-reminders` | BUILD | No smart-reminder management surface found. Evidence: audit-artifacts/gap-closure-audit/patient-web-manual-evidence/FINAL_ONBOARDING_DIAGNOSTICS_HEALTH_ROOT_MANUAL_REVIEW_2026-08-26.md | CTA→contract→authz→authoritative data→all state branches→tests/runtime/ops evidence. |
| PM-121 | `health/trends` | COMPLETE_OR_REPLACE | Protected trend display exists but no methodology, interpretation, anomaly escalation or corrective-action CTA is evidenced. Evidence: audit-artifacts/gap-closure-audit/patient-web-manual-evidence/HEALTH_READ_SUMMARIES_MANUAL_REVIEW_2026-08-26.md | CTA→contract→authz→authoritative data→all state branches→tests/runtime/ops evidence. |
| PM-122 | `health/vitals-log` | BUILD | Vitals history is explicitly read-only; no manual log/add/edit/delete/import or alert threshold flow is evidenced. Evidence: audit-artifacts/gap-closure-audit/patient-web-manual-evidence/HEALTH_READ_SUMMARIES_MANUAL_REVIEW_2026-08-26.md | CTA→contract→authz→authoritative data→all state branches→tests/runtime/ops evidence. |
| PM-123 | `health/vitals` | COMPLETE_OR_REPLACE | Protected vital-history display exists; provenance, ownership and clinical-action paths are not evidenced. Evidence: audit-artifacts/gap-closure-audit/patient-web-manual-evidence/HEALTH_READ_SUMMARIES_MANUAL_REVIEW_2026-08-26.md | CTA→contract→authz→authoritative data→all state branches→tests/runtime/ops evidence. |
| PM-124 | `health/wearables` | BUILD | No wearable/device connection surface was located in the Web health route tree. Evidence: audit-artifacts/gap-closure-audit/patient-web-manual-evidence/HEALTH_READ_SUMMARIES_MANUAL_REVIEW_2026-08-26.md | CTA→contract→authz→authoritative data→all state branches→tests/runtime/ops evidence. |

### 3.insurance — `P0` — Payer/co-pay

**Required journey scenario:** policy consent → eligibility/request → full/partial/reject/co-pay decision + reason → patient alternative/payment → confirmation

| ID | Mobile-origin route / required Web surface | Build status | Source finding / boundary | Required completion definition |
|---|---|---|---|---|
| PM-126 | `insurance/add-policy` | BUILD | Insurance page is summary-only; no corresponding action workflow/CTA found. Evidence: audit-artifacts/gap-closure-audit/patient-web-manual-evidence/INSURANCE_ACTIONS_MANUAL_REVIEW_2026-08-26.md | CTA→contract→authz→authoritative data→all state branches→tests/runtime/ops evidence. |
| PM-127 | `insurance/approval-pending` | BUILD | Insurance page is summary-only; no corresponding action workflow/CTA found. Evidence: audit-artifacts/gap-closure-audit/patient-web-manual-evidence/INSURANCE_ACTIONS_MANUAL_REVIEW_2026-08-26.md | CTA→contract→authz→authoritative data→all state branches→tests/runtime/ops evidence. |
| PM-129 | `insurance/claim-tracking` | COMPLETE_OR_REPLACE | Claims are read-only summaries; no claim action/dispute/decision workflow exists. Evidence: audit-artifacts/gap-closure-audit/patient-web-manual-evidence/PHI_CONTENT_NOTIFICATIONS_CHAT_MENTAL_HEALTH_MANUAL_REVIEW_2026-08-26.md | CTA→contract→authz→authoritative data→all state branches→tests/runtime/ops evidence. |
| PM-130 | `insurance/copay` | BUILD | Insurance page is summary-only; no corresponding action workflow/CTA found. Evidence: audit-artifacts/gap-closure-audit/patient-web-manual-evidence/INSURANCE_ACTIONS_MANUAL_REVIEW_2026-08-26.md | CTA→contract→authz→authoritative data→all state branches→tests/runtime/ops evidence. |
| PM-131 | `insurance/coverage-check` | BUILD | Insurance page is summary-only; no corresponding action workflow/CTA found. Evidence: audit-artifacts/gap-closure-audit/patient-web-manual-evidence/INSURANCE_ACTIONS_MANUAL_REVIEW_2026-08-26.md | CTA→contract→authz→authoritative data→all state branches→tests/runtime/ops evidence. |
| PM-132 | `insurance/hub` | BUILD | Insurance hub is read-only policy/claims summary without policy/benefit/co-pay/payer action flow. Evidence: audit-artifacts/gap-closure-audit/patient-web-manual-evidence/PHI_CONTENT_NOTIFICATIONS_CHAT_MENTAL_HEALTH_MANUAL_REVIEW_2026-08-26.md | CTA→contract→authz→authoritative data→all state branches→tests/runtime/ops evidence. |
| PM-133 | `insurance/index` | BUILD | Insurance hub is read-only policy/claims summary without policy/benefit/co-pay/payer action flow. Evidence: audit-artifacts/gap-closure-audit/patient-web-manual-evidence/PHI_CONTENT_NOTIFICATIONS_CHAT_MENTAL_HEALTH_MANUAL_REVIEW_2026-08-26.md | CTA→contract→authz→authoritative data→all state branches→tests/runtime/ops evidence. |
| PM-134 | `insurance/network-providers` | BUILD | Insurance page is summary-only; no corresponding action workflow/CTA found. Evidence: audit-artifacts/gap-closure-audit/patient-web-manual-evidence/INSURANCE_ACTIONS_MANUAL_REVIEW_2026-08-26.md | CTA→contract→authz→authoritative data→all state branches→tests/runtime/ops evidence. |
| PM-135 | `insurance/payment-split` | BUILD | Insurance page is summary-only; no corresponding action workflow/CTA found. Evidence: audit-artifacts/gap-closure-audit/patient-web-manual-evidence/INSURANCE_ACTIONS_MANUAL_REVIEW_2026-08-26.md | CTA→contract→authz→authoritative data→all state branches→tests/runtime/ops evidence. |
| PM-136 | `insurance/policy-detail` | BUILD | Insurance page is summary-only; no corresponding action workflow/CTA found. Evidence: audit-artifacts/gap-closure-audit/patient-web-manual-evidence/INSURANCE_ACTIONS_MANUAL_REVIEW_2026-08-26.md | CTA→contract→authz→authoritative data→all state branches→tests/runtime/ops evidence. |
| PM-137 | `insurance/refund-status` | BUILD | Insurance page is summary-only; no corresponding action workflow/CTA found. Evidence: audit-artifacts/gap-closure-audit/patient-web-manual-evidence/INSURANCE_ACTIONS_MANUAL_REVIEW_2026-08-26.md | CTA→contract→authz→authoritative data→all state branches→tests/runtime/ops evidence. |
| PM-138 | `insurance/submit-claim` | BUILD | Insurance page is summary-only; no corresponding action workflow/CTA found. Evidence: audit-artifacts/gap-closure-audit/patient-web-manual-evidence/INSURANCE_ACTIONS_MANUAL_REVIEW_2026-08-26.md | CTA→contract→authz→authoritative data→all state branches→tests/runtime/ops evidence. |

### 3.loyalty — `P1` — Loyalty

**Required journey scenario:** eligibility → earn/redeem → immutable balance/reversal → anti-abuse/audit

| ID | Mobile-origin route / required Web surface | Build status | Source finding / boundary | Required completion definition |
|---|---|---|---|---|
| PM-139 | `loyalty/challenges` | BUILD | No localized Web loyalty feature surface/CTA found. Evidence: audit-artifacts/gap-closure-audit/patient-web-manual-evidence/AI_EMERGENCY_WALLET_LOYALTY_RETURNS_MANUAL_REVIEW_2026-08-26.md | CTA→contract→authz→authoritative data→all state branches→tests/runtime/ops evidence. |
| PM-140 | `loyalty/hub` | BUILD | No localized Web loyalty feature surface/CTA found. Evidence: audit-artifacts/gap-closure-audit/patient-web-manual-evidence/AI_EMERGENCY_WALLET_LOYALTY_RETURNS_MANUAL_REVIEW_2026-08-26.md | CTA→contract→authz→authoritative data→all state branches→tests/runtime/ops evidence. |
| PM-141 | `loyalty/leaderboard` | BUILD | No localized Web loyalty feature surface/CTA found. Evidence: audit-artifacts/gap-closure-audit/patient-web-manual-evidence/AI_EMERGENCY_WALLET_LOYALTY_RETURNS_MANUAL_REVIEW_2026-08-26.md | CTA→contract→authz→authoritative data→all state branches→tests/runtime/ops evidence. |
| PM-142 | `loyalty/referrals` | BUILD | No localized Web loyalty feature surface/CTA found. Evidence: audit-artifacts/gap-closure-audit/patient-web-manual-evidence/AI_EMERGENCY_WALLET_LOYALTY_RETURNS_MANUAL_REVIEW_2026-08-26.md | CTA→contract→authz→authoritative data→all state branches→tests/runtime/ops evidence. |
| PM-143 | `loyalty/rewards` | BUILD | No localized Web loyalty feature surface/CTA found. Evidence: audit-artifacts/gap-closure-audit/patient-web-manual-evidence/AI_EMERGENCY_WALLET_LOYALTY_RETURNS_MANUAL_REVIEW_2026-08-26.md | CTA→contract→authz→authoritative data→all state branches→tests/runtime/ops evidence. |

### 3.map — `P1` — Cross-cutting / source reconciliation

**Required journey scenario:** complete exact CTA → contract → authz → authoritative data → real result/error/recovery; no source evidence of backend behavior is assumed

| ID | Mobile-origin route / required Web surface | Build status | Source finding / boundary | Required completion definition |
|---|---|---|---|---|
| PM-144 | `map/index` | BUILD | No corresponding localized Web discovery/payment/support surface or CTA found. Evidence: audit-artifacts/gap-closure-audit/patient-web-manual-evidence/GENERAL_DISCOVERY_PAYMENT_SUPPORT_MANUAL_REVIEW_2026-08-26.md | CTA→contract→authz→authoritative data→all state branches→tests/runtime/ops evidence. |

### 3.maternity — `P1-SAFETY` — Maternity

**Required journey scenario:** clinically approved content/data → consent → review/escalation → accurate state and audit

| ID | Mobile-origin route / required Web surface | Build status | Source finding / boundary | Required completion definition |
|---|---|---|---|---|
| PM-145 | `maternity/baby-development` | BUILD | No localized Web maternity route/source/CTA found. Evidence: audit-artifacts/gap-closure-audit/patient-web-manual-evidence/NUTRITION_MATERNITY_MANUAL_REVIEW_2026-08-26.md | CTA→contract→authz→authoritative data→all state branches→tests/runtime/ops evidence. |
| PM-146 | `maternity/baby-growth` | BUILD | No localized Web maternity route/source/CTA found. Evidence: audit-artifacts/gap-closure-audit/patient-web-manual-evidence/NUTRITION_MATERNITY_MANUAL_REVIEW_2026-08-26.md | CTA→contract→authz→authoritative data→all state branches→tests/runtime/ops evidence. |
| PM-147 | `maternity/fetus-data` | BUILD | No localized Web maternity route/source/CTA found. Evidence: audit-artifacts/gap-closure-audit/patient-web-manual-evidence/NUTRITION_MATERNITY_MANUAL_REVIEW_2026-08-26.md | CTA→contract→authz→authoritative data→all state branches→tests/runtime/ops evidence. |
| PM-148 | `maternity/hub` | BUILD | No localized Web maternity route/source/CTA found. Evidence: audit-artifacts/gap-closure-audit/patient-web-manual-evidence/NUTRITION_MATERNITY_MANUAL_REVIEW_2026-08-26.md | CTA→contract→authz→authoritative data→all state branches→tests/runtime/ops evidence. |
| PM-149 | `maternity/maternity-setup` | BUILD | No localized Web maternity route/source/CTA found. Evidence: audit-artifacts/gap-closure-audit/patient-web-manual-evidence/NUTRITION_MATERNITY_MANUAL_REVIEW_2026-08-26.md | CTA→contract→authz→authoritative data→all state branches→tests/runtime/ops evidence. |
| PM-150 | `maternity/ovulation-tracker` | BUILD | No localized Web maternity route/source/CTA found. Evidence: audit-artifacts/gap-closure-audit/patient-web-manual-evidence/NUTRITION_MATERNITY_MANUAL_REVIEW_2026-08-26.md | CTA→contract→authz→authoritative data→all state branches→tests/runtime/ops evidence. |
| PM-151 | `maternity/pregnancy-tracker` | BUILD | No localized Web maternity route/source/CTA found. Evidence: audit-artifacts/gap-closure-audit/patient-web-manual-evidence/NUTRITION_MATERNITY_MANUAL_REVIEW_2026-08-26.md | CTA→contract→authz→authoritative data→all state branches→tests/runtime/ops evidence. |

### 3.mental-health — `P0-SAFETY` — Mental-health safety

**Required journey scenario:** approved content/workflow → crisis path/escalation → clinical ownership → safe failure/audit

| ID | Mobile-origin route / required Web surface | Build status | Source finding / boundary | Required completion definition |
|---|---|---|---|---|
| PM-152 | `mental-health/breathing` | COMPLETE_OR_REPLACE | Protected breathing history exists, but no start/live guidance/entry/escalation CTA. Evidence: audit-artifacts/gap-closure-audit/patient-web-manual-evidence/MENTAL_HEALTH_INTERVENTION_MANUAL_REVIEW_2026-08-26.md | CTA→contract→authz→authoritative data→all state branches→tests/runtime/ops evidence. |
| PM-153 | `mental-health/crisis-support` | BUILD | Crisis-contact cards do not provide call/SOS/geolocation/handoff/confirmation safety workflow. Evidence: audit-artifacts/gap-closure-audit/patient-web-manual-evidence/MENTAL_HEALTH_INTERVENTION_MANUAL_REVIEW_2026-08-26.md | CTA→contract→authz→authoritative data→all state branches→tests/runtime/ops evidence. |
| PM-154 | `mental-health/hub` | BUILD | Wellbeing aggregates/history links exist but no active care, therapist, safety or crisis escalation workflow is evidenced. Evidence: audit-artifacts/gap-closure-audit/patient-web-manual-evidence/PHI_CONTENT_NOTIFICATIONS_CHAT_MENTAL_HEALTH_MANUAL_REVIEW_2026-0 | CTA→contract→authz→authoritative data→all state branches→tests/runtime/ops evidence. |
| PM-155 | `mental-health/index` | BUILD | Wellbeing aggregates/history links exist but no active care, therapist, safety or crisis escalation workflow is evidenced. Evidence: audit-artifacts/gap-closure-audit/patient-web-manual-evidence/PHI_CONTENT_NOTIFICATIONS_CHAT_MENTAL_HEALTH_MANUAL_REVIEW_2026-0 | CTA→contract→authz→authoritative data→all state branches→tests/runtime/ops evidence. |
| PM-156 | `mental-health/meditation` | COMPLETE_OR_REPLACE | Protected meditation history exists, but no start/program/feedback/intervention CTA. Evidence: audit-artifacts/gap-closure-audit/patient-web-manual-evidence/MENTAL_HEALTH_INTERVENTION_MANUAL_REVIEW_2026-08-26.md | CTA→contract→authz→authoritative data→all state branches→tests/runtime/ops evidence. |
| PM-157 | `mental-health/mood-journal` | BUILD | No mood-journal entry or clinical escalation surface found. Evidence: audit-artifacts/gap-closure-audit/patient-web-manual-evidence/MENTAL_HEALTH_INTERVENTION_MANUAL_REVIEW_2026-08-26.md | CTA→contract→authz→authoritative data→all state branches→tests/runtime/ops evidence. |
| PM-158 | `mental-health/self-assessment` | BUILD | No self-assessment/scoring consent or clinical referral surface found. Evidence: audit-artifacts/gap-closure-audit/patient-web-manual-evidence/MENTAL_HEALTH_INTERVENTION_MANUAL_REVIEW_2026-08-26.md | CTA→contract→authz→authoritative data→all state branches→tests/runtime/ops evidence. |
| PM-159 | `mental-health/therapist-match` | BUILD | No therapist-match/provider/booking surface found. Evidence: audit-artifacts/gap-closure-audit/patient-web-manual-evidence/MENTAL_HEALTH_INTERVENTION_MANUAL_REVIEW_2026-08-26.md | CTA→contract→authz→authoritative data→all state branches→tests/runtime/ops evidence. |

### 3.notifications — `P0` — Notifications

**Required journey scenario:** preference → event → delivery/retry → deep link/action → read/dismiss/audit

| ID | Mobile-origin route / required Web surface | Build status | Source finding / boundary | Required completion definition |
|---|---|---|---|---|
| PM-160 | `notifications/index` | COMPLETE_OR_REPLACE | Protected inbox/settings link exists but no mark-read/delete/deep-link action. Evidence: audit-artifacts/gap-closure-audit/patient-web-manual-evidence/FINAL_ONBOARDING_DIAGNOSTICS_HEALTH_ROOT_MANUAL_REVIEW_2026-08-26.md | CTA→contract→authz→authoritative data→all state branches→tests/runtime/ops evidence. |

### 3.nursing — `P0` — Home-care/nursing

**Required journey scenario:** service/address/assessment → caregiver/slot → quote/payment/insurance → assignment → visit progress → completion/issue

| ID | Mobile-origin route / required Web surface | Build status | Source finding / boundary | Required completion definition |
|---|---|---|---|---|
| PM-161 | `nursing/live-tracking` | BUILD | No Web nursing live-tracking surface was located; generic home-care catalog is not equivalent evidence. Evidence: audit-artifacts/gap-closure-audit/patient-web-manual-evidence/CONSULTATION_BOOKING_DIAGNOSTICS_HOME_CARE_MANUAL_REVIEW_2026-08-26.md | CTA→contract→authz→authoritative data→all state branches→tests/runtime/ops evidence. |
| PM-162 | `nursing/nurse-profile` | BUILD | No Web nursing-profile surface was located; generic home-care catalog is not equivalent evidence. Evidence: audit-artifacts/gap-closure-audit/patient-web-manual-evidence/CONSULTATION_BOOKING_DIAGNOSTICS_HOME_CARE_MANUAL_REVIEW_2026-08-26.md | CTA→contract→authz→authoritative data→all state branches→tests/runtime/ops evidence. |
| PM-163 | `nursing/service-details` | BUILD | Home-care service detail displays catalog facts only; no nursing booking/provider/payment/insurance handoff is evidenced. Evidence: audit-artifacts/gap-closure-audit/patient-web-manual-evidence/CONSULTATION_BOOKING_DIAGNOSTICS_HOME_CARE_MANUAL_REVIEW_2026-08-2 | CTA→contract→authz→authoritative data→all state branches→tests/runtime/ops evidence. |
| PM-164 | `nursing/service-info` | BUILD | Home-care service information is catalog-only; no nursing service workflow or authoritative fulfillment state is evidenced. Evidence: audit-artifacts/gap-closure-audit/patient-web-manual-evidence/CONSULTATION_BOOKING_DIAGNOSTICS_HOME_CARE_MANUAL_REVIEW_2026-08 | CTA→contract→authz→authoritative data→all state branches→tests/runtime/ops evidence. |

### 3.nutrition — `P1-SAFETY` — Nutrition

**Required journey scenario:** clinically approved data/content → consent → transparent limitations → human referral/escalation

| ID | Mobile-origin route / required Web surface | Build status | Source finding / boundary | Required completion definition |
|---|---|---|---|---|
| PM-165 | `nutrition/ai-meal-planner` | BUILD | No localized Web nutrition route/source/CTA found. Evidence: audit-artifacts/gap-closure-audit/patient-web-manual-evidence/NUTRITION_MATERNITY_MANUAL_REVIEW_2026-08-26.md | CTA→contract→authz→authoritative data→all state branches→tests/runtime/ops evidence. |
| PM-166 | `nutrition/ai-plan-builder` | BUILD | No localized Web nutrition route/source/CTA found. Evidence: audit-artifacts/gap-closure-audit/patient-web-manual-evidence/NUTRITION_MATERNITY_MANUAL_REVIEW_2026-08-26.md | CTA→contract→authz→authoritative data→all state branches→tests/runtime/ops evidence. |
| PM-167 | `nutrition/body-composition` | BUILD | No localized Web nutrition route/source/CTA found. Evidence: audit-artifacts/gap-closure-audit/patient-web-manual-evidence/NUTRITION_MATERNITY_MANUAL_REVIEW_2026-08-26.md | CTA→contract→authz→authoritative data→all state branches→tests/runtime/ops evidence. |
| PM-168 | `nutrition/body-target` | BUILD | No localized Web nutrition route/source/CTA found. Evidence: audit-artifacts/gap-closure-audit/patient-web-manual-evidence/NUTRITION_MATERNITY_MANUAL_REVIEW_2026-08-26.md | CTA→contract→authz→authoritative data→all state branches→tests/runtime/ops evidence. |
| PM-169 | `nutrition/calorie-analyzer` | BUILD | No localized Web nutrition route/source/CTA found. Evidence: audit-artifacts/gap-closure-audit/patient-web-manual-evidence/NUTRITION_MATERNITY_MANUAL_REVIEW_2026-08-26.md | CTA→contract→authz→authoritative data→all state branches→tests/runtime/ops evidence. |
| PM-170 | `nutrition/daily-tracker` | BUILD | No localized Web nutrition route/source/CTA found. Evidence: audit-artifacts/gap-closure-audit/patient-web-manual-evidence/NUTRITION_MATERNITY_MANUAL_REVIEW_2026-08-26.md | CTA→contract→authz→authoritative data→all state branches→tests/runtime/ops evidence. |
| PM-171 | `nutrition/exercise-plan` | BUILD | No localized Web nutrition route/source/CTA found. Evidence: audit-artifacts/gap-closure-audit/patient-web-manual-evidence/NUTRITION_MATERNITY_MANUAL_REVIEW_2026-08-26.md | CTA→contract→authz→authoritative data→all state branches→tests/runtime/ops evidence. |
| PM-172 | `nutrition/food-scanner` | BUILD | No localized Web nutrition route/source/CTA found. Evidence: audit-artifacts/gap-closure-audit/patient-web-manual-evidence/NUTRITION_MATERNITY_MANUAL_REVIEW_2026-08-26.md | CTA→contract→authz→authoritative data→all state branches→tests/runtime/ops evidence. |
| PM-173 | `nutrition/hub` | BUILD | No localized Web nutrition route/source/CTA found. Evidence: audit-artifacts/gap-closure-audit/patient-web-manual-evidence/NUTRITION_MATERNITY_MANUAL_REVIEW_2026-08-26.md | CTA→contract→authz→authoritative data→all state branches→tests/runtime/ops evidence. |
| PM-174 | `nutrition/index` | BUILD | No localized Web nutrition route/source/CTA found. Evidence: audit-artifacts/gap-closure-audit/patient-web-manual-evidence/NUTRITION_MATERNITY_MANUAL_REVIEW_2026-08-26.md | CTA→contract→authz→authoritative data→all state branches→tests/runtime/ops evidence. |
| PM-175 | `nutrition/log-meal` | BUILD | No localized Web nutrition route/source/CTA found. Evidence: audit-artifacts/gap-closure-audit/patient-web-manual-evidence/NUTRITION_MATERNITY_MANUAL_REVIEW_2026-08-26.md | CTA→contract→authz→authoritative data→all state branches→tests/runtime/ops evidence. |
| PM-176 | `nutrition/nutrition-plan` | BUILD | No localized Web nutrition route/source/CTA found. Evidence: audit-artifacts/gap-closure-audit/patient-web-manual-evidence/NUTRITION_MATERNITY_MANUAL_REVIEW_2026-08-26.md | CTA→contract→authz→authoritative data→all state branches→tests/runtime/ops evidence. |
| PM-177 | `nutrition/water-tracker` | BUILD | No localized Web nutrition route/source/CTA found. Evidence: audit-artifacts/gap-closure-audit/patient-web-manual-evidence/NUTRITION_MATERNITY_MANUAL_REVIEW_2026-08-26.md | CTA→contract→authz→authoritative data→all state branches→tests/runtime/ops evidence. |

### 3.offers — `P1` — Commercial offers

**Required journey scenario:** eligibility/publish window → truthful price terms → redemption → audit/reversal

| ID | Mobile-origin route / required Web surface | Build status | Source finding / boundary | Required completion definition |
|---|---|---|---|---|
| PM-178 | `offers/[id]` | BUILD | No corresponding localized Web discovery/payment/support surface or CTA found. Evidence: audit-artifacts/gap-closure-audit/patient-web-manual-evidence/GENERAL_DISCOVERY_PAYMENT_SUPPORT_MANUAL_REVIEW_2026-08-26.md | CTA→contract→authz→authoritative data→all state branches→tests/runtime/ops evidence. |
| PM-179 | `offers/index` | BUILD | No corresponding localized Web discovery/payment/support surface or CTA found. Evidence: audit-artifacts/gap-closure-audit/patient-web-manual-evidence/GENERAL_DISCOVERY_PAYMENT_SUPPORT_MANUAL_REVIEW_2026-08-26.md | CTA→contract→authz→authoritative data→all state branches→tests/runtime/ops evidence. |

### 3.onboarding — `P0` — Identity onboarding

**Required journey scenario:** locale/legal/consent → registration/OTP/verification → session → safe recovery/blocked states

| ID | Mobile-origin route / required Web surface | Build status | Source finding / boundary | Required completion definition |
|---|---|---|---|---|
| PM-010 | `(onboarding)/index` | COMPLETE_OR_REPLACE | Public landing exists but is not Mobile onboarding state machine. Evidence: audit-artifacts/gap-closure-audit/patient-web-manual-evidence/FINAL_ONBOARDING_DIAGNOSTICS_HEALTH_ROOT_MANUAL_REVIEW_2026-08-26.md | CTA→contract→authz→authoritative data→all state branches→tests/runtime/ops evidence. |
| PM-011 | `(onboarding)/language` | BUILD | No onboarding language surface/control found. Evidence: audit-artifacts/gap-closure-audit/patient-web-manual-evidence/FINAL_ONBOARDING_DIAGNOSTICS_HEALTH_ROOT_MANUAL_REVIEW_2026-08-26.md | CTA→contract→authz→authoritative data→all state branches→tests/runtime/ops evidence. |
| PM-012 | `(onboarding)/permissions` | BUILD | No onboarding permissions/consent surface found. Evidence: audit-artifacts/gap-closure-audit/patient-web-manual-evidence/FINAL_ONBOARDING_DIAGNOSTICS_HEALTH_ROOT_MANUAL_REVIEW_2026-08-26.md | CTA→contract→authz→authoritative data→all state branches→tests/runtime/ops evidence. |
| PM-125 | `index` | COMPLETE_OR_REPLACE | Public landing exists but not authenticated patient home parity. Evidence: audit-artifacts/gap-closure-audit/patient-web-manual-evidence/FINAL_ONBOARDING_DIAGNOSTICS_HEALTH_ROOT_MANUAL_REVIEW_2026-08-26.md | CTA→contract→authz→authoritative data→all state branches→tests/runtime/ops evidence. |

### 3.orders — `P1` — Cross-cutting / source reconciliation

**Required journey scenario:** complete exact CTA → contract → authz → authoritative data → real result/error/recovery; no source evidence of backend behavior is assumed

| ID | Mobile-origin route / required Web surface | Build status | Source finding / boundary | Required completion definition |
|---|---|---|---|---|
| PM-180 | `orders/index` | COMPLETE_OR_REPLACE | Read-only pharmacy-order history and client status tabs; no provider/payment/insurance lifecycle evidence. Evidence: audit-artifacts/gap-closure-audit/patient-web-manual-evidence/PHARMACY_CART_OFFERS_PAYMENT_ORDERS_MANUAL_REVIEW_2026-08-26.md | CTA→contract→authz→authoritative data→all state branches→tests/runtime/ops evidence. |

### 3.payments — `P0` — Payments/ledger

**Required journey scenario:** payment intent → provider authorization → verified webhook → ledger/receipt → failure/retry/refund/dispute

| ID | Mobile-origin route / required Web surface | Build status | Source finding / boundary | Required completion definition |
|---|---|---|---|---|
| PM-181 | `payments/failed` | BUILD | No corresponding localized Web discovery/payment/support surface or CTA found. Evidence: audit-artifacts/gap-closure-audit/patient-web-manual-evidence/GENERAL_DISCOVERY_PAYMENT_SUPPORT_MANUAL_REVIEW_2026-08-26.md | CTA→contract→authz→authoritative data→all state branches→tests/runtime/ops evidence. |
| PM-182 | `payments/failure` | BUILD | No corresponding localized Web discovery/payment/support surface or CTA found. Evidence: audit-artifacts/gap-closure-audit/patient-web-manual-evidence/GENERAL_DISCOVERY_PAYMENT_SUPPORT_MANUAL_REVIEW_2026-08-26.md | CTA→contract→authz→authoritative data→all state branches→tests/runtime/ops evidence. |
| PM-183 | `payments/processing` | BUILD | No corresponding localized Web discovery/payment/support surface or CTA found. Evidence: audit-artifacts/gap-closure-audit/patient-web-manual-evidence/GENERAL_DISCOVERY_PAYMENT_SUPPORT_MANUAL_REVIEW_2026-08-26.md | CTA→contract→authz→authoritative data→all state branches→tests/runtime/ops evidence. |
| PM-184 | `payments/success` | BUILD | No corresponding localized Web discovery/payment/support surface or CTA found. Evidence: audit-artifacts/gap-closure-audit/patient-web-manual-evidence/GENERAL_DISCOVERY_PAYMENT_SUPPORT_MANUAL_REVIEW_2026-08-26.md | CTA→contract→authz→authoritative data→all state branches→tests/runtime/ops evidence. |

### 3.pharmacy — `P0` — Pharmacy offers

**Required journey scenario:** cart/Rx/address → geo broadcast → offers with stock/substitution/price/ETA → selection lock → payment/COD/insurance → fulfillment → issue/refund

| ID | Mobile-origin route / required Web surface | Build status | Source finding / boundary | Required completion definition |
|---|---|---|---|---|
| PM-185 | `pharmacy/barcode-scanner` | BUILD | No corresponding localized Web pharmacy auxiliary surface/CTA found. Evidence: audit-artifacts/gap-closure-audit/patient-web-manual-evidence/PHARMACY_AUXILIARY_MANUAL_REVIEW_2026-08-26.md | CTA→contract→authz→authoritative data→all state branches→tests/runtime/ops evidence. |
| PM-186 | `pharmacy/broadcast-status` | BUILD | No Web broadcast-status or pharmacy-offer surface was located in reviewed source; no mutation scan evidence for broadcast/select-offer exists. Evidence: audit-artifacts/gap-closure-audit/patient-web-manual-evidence/PHARMACY_CART_OFFERS_PAYMENT_ORDERS_MANUAL_RE | CTA→contract→authz→authoritative data→all state branches→tests/runtime/ops evidence. |
| PM-187 | `pharmacy/cart` | COMPLETE_OR_REPLACE | Cart summary renders server-returned groups/totals only; no cart mutation, submit, geo, Rx, offer or checkout CTA is evidenced. Evidence: audit-artifacts/gap-closure-audit/patient-web-manual-evidence/PHARMACY_CART_OFFERS_PAYMENT_ORDERS_MANUAL_REVIEW_2026-08-26 | CTA→contract→authz→authoritative data→all state branches→tests/runtime/ops evidence. |
| PM-188 | `pharmacy/chat-with-pharmacist` | BUILD | No corresponding localized Web pharmacy auxiliary surface/CTA found. Evidence: audit-artifacts/gap-closure-audit/patient-web-manual-evidence/PHARMACY_AUXILIARY_MANUAL_REVIEW_2026-08-26.md | CTA→contract→authz→authoritative data→all state branches→tests/runtime/ops evidence. |
| PM-189 | `pharmacy/checkout` | BUILD | Checkout route is a GET total preview with only a back link; no offer selection, payment, insurance or order submit CTA is evidenced. Evidence: audit-artifacts/gap-closure-audit/patient-web-manual-evidence/PHARMACY_CART_OFFERS_PAYMENT_ORDERS_MANUAL_REVIEW_2026 | CTA→contract→authz→authoritative data→all state branches→tests/runtime/ops evidence. |
| PM-190 | `pharmacy/custom-item` | BUILD | No corresponding localized Web pharmacy auxiliary surface/CTA found. Evidence: audit-artifacts/gap-closure-audit/patient-web-manual-evidence/PHARMACY_AUXILIARY_MANUAL_REVIEW_2026-08-26.md | CTA→contract→authz→authoritative data→all state branches→tests/runtime/ops evidence. |
| PM-191 | `pharmacy/drug-not-found` | BUILD | No corresponding localized Web pharmacy auxiliary surface/CTA found. Evidence: audit-artifacts/gap-closure-audit/patient-web-manual-evidence/PHARMACY_AUXILIARY_MANUAL_REVIEW_2026-08-26.md | CTA→contract→authz→authoritative data→all state branches→tests/runtime/ops evidence. |
| PM-192 | `pharmacy/filters` | BUILD | No corresponding localized Web pharmacy auxiliary surface/CTA found. Evidence: audit-artifacts/gap-closure-audit/patient-web-manual-evidence/PHARMACY_AUXILIARY_MANUAL_REVIEW_2026-08-26.md | CTA→contract→authz→authoritative data→all state branches→tests/runtime/ops evidence. |
| PM-193 | `pharmacy/manual-order` | BUILD | No corresponding localized Web pharmacy auxiliary surface/CTA found. Evidence: audit-artifacts/gap-closure-audit/patient-web-manual-evidence/PHARMACY_AUXILIARY_MANUAL_REVIEW_2026-08-26.md | CTA→contract→authz→authoritative data→all state branches→tests/runtime/ops evidence. |
| PM-194 | `pharmacy/medicine-compare` | BUILD | No corresponding localized Web pharmacy auxiliary surface/CTA found. Evidence: audit-artifacts/gap-closure-audit/patient-web-manual-evidence/PHARMACY_AUXILIARY_MANUAL_REVIEW_2026-08-26.md | CTA→contract→authz→authoritative data→all state branches→tests/runtime/ops evidence. |
| PM-195 | `pharmacy/order-confirm` | BUILD | No Web order-confirmation surface or order-submit mutation was located in reviewed source; post-order read pages do not prove confirmation. Evidence: audit-artifacts/gap-closure-audit/patient-web-manual-evidence/PHARMACY_CART_OFFERS_PAYMENT_ORDERS_MANUAL_REVIE | CTA→contract→authz→authoritative data→all state branches→tests/runtime/ops evidence. |
| PM-196 | `pharmacy/order-history` | COMPLETE_OR_REPLACE | Read-only pharmacy-order history; client status bucket is not an authoritative fulfillment/payment state machine. Evidence: audit-artifacts/gap-closure-audit/patient-web-manual-evidence/PHARMACY_CART_OFFERS_PAYMENT_ORDERS_MANUAL_REVIEW_2026-08-26.md | CTA→contract→authz→authoritative data→all state branches→tests/runtime/ops evidence. |
| PM-197 | `pharmacy/order-tracking` | COMPLETE_OR_REPLACE | Tracking is a protected read summary only; no accept-offer, payment, cancel, contact, dispute or delivery-confirmation CTA is evidenced. Evidence: audit-artifacts/gap-closure-audit/patient-web-manual-evidence/PHARMACY_CART_OFFERS_PAYMENT_ORDERS_MANUAL_REVIEW_2 | CTA→contract→authz→authoritative data→all state branches→tests/runtime/ops evidence. |
| PM-198 | `pharmacy/payment` | BUILD | No Web pharmacy-payment route, local BFF handler or client payment mutation was located; appointment payment intent is booking-specific and not evidence for cart orders. Evidence: audit-artifacts/gap-closure-audit/patient-web-manual-evidence/PHARMACY_CART_OFFE | CTA→contract→authz→authoritative data→all state branches→tests/runtime/ops evidence. |
| PM-199 | `pharmacy/pharmacist-chat` | BUILD | No corresponding localized Web pharmacy auxiliary surface/CTA found. Evidence: audit-artifacts/gap-closure-audit/patient-web-manual-evidence/PHARMACY_AUXILIARY_MANUAL_REVIEW_2026-08-26.md | CTA→contract→authz→authoritative data→all state branches→tests/runtime/ops evidence. |
| PM-200 | `pharmacy/product-detail` | COMPLETE_OR_REPLACE | Public medicine catalog detail exposes facts only and remains noindex; no price/stock/cart/Rx/offer CTA is evidenced. Evidence: audit-artifacts/gap-closure-audit/patient-web-manual-evidence/PHARMACY_CART_OFFERS_PAYMENT_ORDERS_MANUAL_REVIEW_2026-08-26.md | CTA→contract→authz→authoritative data→all state branches→tests/runtime/ops evidence. |
| PM-201 | `pharmacy/product-search` | COMPLETE_OR_REPLACE | Authenticated medicine search exists; no filters, cart, offer or purchase transition is evidenced in the reviewed page. Evidence: audit-artifacts/gap-closure-audit/patient-web-manual-evidence/PHARMACY_CART_OFFERS_PAYMENT_ORDERS_MANUAL_REVIEW_2026-08-26.md | CTA→contract→authz→authoritative data→all state branches→tests/runtime/ops evidence. |
| PM-202 | `pharmacy/reorder` | BUILD | No corresponding localized Web pharmacy auxiliary surface/CTA found. Evidence: audit-artifacts/gap-closure-audit/patient-web-manual-evidence/PHARMACY_AUXILIARY_MANUAL_REVIEW_2026-08-26.md | CTA→contract→authz→authoritative data→all state branches→tests/runtime/ops evidence. |
| PM-203 | `pharmacy/rx-order` | BUILD | Prescription-cart preview displays medication names only; no Rx validation, submit, pharmacist review, broadcast, offer, payment or insurance flow is evidenced. Evidence: audit-artifacts/gap-closure-audit/patient-web-manual-evidence/PHARMACY_CART_OFFERS_PAYMEN | CTA→contract→authz→authoritative data→all state branches→tests/runtime/ops evidence. |
| PM-204 | `pharmacy/scan-prescription` | BUILD | No corresponding localized Web pharmacy auxiliary surface/CTA found. Evidence: audit-artifacts/gap-closure-audit/patient-web-manual-evidence/PHARMACY_AUXILIARY_MANUAL_REVIEW_2026-08-26.md | CTA→contract→authz→authoritative data→all state branches→tests/runtime/ops evidence. |
| PM-205 | `pharmacy/waiting-for-pharmacy` | BUILD | No Web waiting-for-pharmacy or offer-expiry/patient-selection surface was located in reviewed source. Evidence: audit-artifacts/gap-closure-audit/patient-web-manual-evidence/PHARMACY_CART_OFFERS_PAYMENT_ORDERS_MANUAL_REVIEW_2026-08-26.md | CTA→contract→authz→authoritative data→all state branches→tests/runtime/ops evidence. |
| PM-206 | `pharmacy/wishlist` | COMPLETE_OR_REPLACE | Protected wishlist reads item facts and links to medicine detail; no wishlist mutation or purchase/stock workflow. Evidence: audit-artifacts/gap-closure-audit/patient-web-manual-evidence/PHARMACY_AUXILIARY_MANUAL_REVIEW_2026-08-26.md | CTA→contract→authz→authoritative data→all state branches→tests/runtime/ops evidence. |

### 3.profile — `P0` — Profile/address/insurance

**Required journey scenario:** identity-bound read/edit → validation → audit/consent → real persistence and error recovery

| ID | Mobile-origin route / required Web surface | Build status | Source finding / boundary | Required completion definition |
|---|---|---|---|---|
| PM-207 | `profile/addresses` | BUILD | No localized addresses surface, address CTA, or address mutation was found in reviewed source. Evidence: audit-artifacts/gap-closure-audit/patient-web-manual-evidence/PROFILE_ADDRESSES_MANUAL_REVIEW_2026-08-26.md | CTA→contract→authz→authoritative data→all state branches→tests/runtime/ops evidence. |
| PM-208 | `profile/edit` | BUILD | Profile is display-only; no profile or medical-profile edit CTA/mutation is evidenced. Evidence: audit-artifacts/gap-closure-audit/patient-web-manual-evidence/PROFILE_ADDRESSES_MANUAL_REVIEW_2026-08-26.md | CTA→contract→authz→authoritative data→all state branches→tests/runtime/ops evidence. |
| PM-209 | `profile/index` | COMPLETE_OR_REPLACE | Protected profile/medical/insurance display exists; field-level ownership/freshness and management controls remain unproven. Evidence: audit-artifacts/gap-closure-audit/patient-web-manual-evidence/PROFILE_ADDRESSES_MANUAL_REVIEW_2026-08-26.md | CTA→contract→authz→authoritative data→all state branches→tests/runtime/ops evidence. |
| PM-210 | `profile/insurance` | BUILD | Profile shows selected insurance fields only; no policy/benefits/coverage/co-pay management path is evidenced. Evidence: audit-artifacts/gap-closure-audit/patient-web-manual-evidence/PROFILE_ADDRESSES_MANUAL_REVIEW_2026-08-26.md | CTA→contract→authz→authoritative data→all state branches→tests/runtime/ops evidence. |

### 3.programs — `P1` — Cross-cutting / source reconciliation

**Required journey scenario:** complete exact CTA → contract → authz → authoritative data → real result/error/recovery; no source evidence of backend behavior is assumed

| ID | Mobile-origin route / required Web surface | Build status | Source finding / boundary | Required completion definition |
|---|---|---|---|---|
| PM-211 | `programs/active` | BUILD | No corresponding localized Web discovery/payment/support surface or CTA found. Evidence: audit-artifacts/gap-closure-audit/patient-web-manual-evidence/GENERAL_DISCOVERY_PAYMENT_SUPPORT_MANUAL_REVIEW_2026-08-26.md | CTA→contract→authz→authoritative data→all state branches→tests/runtime/ops evidence. |

### 3.reports — `P1` — PHI reports

**Required journey scenario:** authorized report state → provenance/signature → secure access/export/share → amendment/audit

| ID | Mobile-origin route / required Web surface | Build status | Source finding / boundary | Required completion definition |
|---|---|---|---|---|
| PM-212 | `reports/ai-analysis` | BUILD | No corresponding localized Web discovery/payment/support surface or CTA found. Evidence: audit-artifacts/gap-closure-audit/patient-web-manual-evidence/GENERAL_DISCOVERY_PAYMENT_SUPPORT_MANUAL_REVIEW_2026-08-26.md | CTA→contract→authz→authoritative data→all state branches→tests/runtime/ops evidence. |
| PM-213 | `reports/hub` | BUILD | Protected report summary list has no report hub/detail/download/share/provenance workflow. Evidence: audit-artifacts/gap-closure-audit/patient-web-manual-evidence/PHI_CONTENT_NOTIFICATIONS_CHAT_MENTAL_HEALTH_MANUAL_REVIEW_2026-08-26.md | CTA→contract→authz→authoritative data→all state branches→tests/runtime/ops evidence. |
| PM-214 | `reports/passport` | BUILD | No corresponding localized Web discovery/payment/support surface or CTA found. Evidence: audit-artifacts/gap-closure-audit/patient-web-manual-evidence/GENERAL_DISCOVERY_PAYMENT_SUPPORT_MANUAL_REVIEW_2026-08-26.md | CTA→contract→authz→authoritative data→all state branches→tests/runtime/ops evidence. |
| PM-215 | `reports/timeline` | BUILD | No corresponding localized Web discovery/payment/support surface or CTA found. Evidence: audit-artifacts/gap-closure-audit/patient-web-manual-evidence/GENERAL_DISCOVERY_PAYMENT_SUPPORT_MANUAL_REVIEW_2026-08-26.md | CTA→contract→authz→authoritative data→all state branches→tests/runtime/ops evidence. |
| PM-216 | `reports/view-report` | BUILD | Protected report summary list has no report body/download/share/provenance workflow. Evidence: audit-artifacts/gap-closure-audit/patient-web-manual-evidence/PHI_CONTENT_NOTIFICATIONS_CHAT_MENTAL_HEALTH_MANUAL_REVIEW_2026-08-26.md | CTA→contract→authz→authoritative data→all state branches→tests/runtime/ops evidence. |

### 3.returns — `P0` — Refund/dispute

**Required journey scenario:** eligibility → evidence → approval/reject → PSP reversal/refund + ledger/inventory adjustment → notification

| ID | Mobile-origin route / required Web surface | Build status | Source finding / boundary | Required completion definition |
|---|---|---|---|---|
| PM-217 | `returns/detail` | BUILD | No localized Web returns feature surface/CTA found. Evidence: audit-artifacts/gap-closure-audit/patient-web-manual-evidence/AI_EMERGENCY_WALLET_LOYALTY_RETURNS_MANUAL_REVIEW_2026-08-26.md | CTA→contract→authz→authoritative data→all state branches→tests/runtime/ops evidence. |
| PM-218 | `returns/hub` | BUILD | No localized Web returns feature surface/CTA found. Evidence: audit-artifacts/gap-closure-audit/patient-web-manual-evidence/AI_EMERGENCY_WALLET_LOYALTY_RETURNS_MANUAL_REVIEW_2026-08-26.md | CTA→contract→authz→authoritative data→all state branches→tests/runtime/ops evidence. |
| PM-219 | `returns/new-request` | BUILD | No localized Web returns feature surface/CTA found. Evidence: audit-artifacts/gap-closure-audit/patient-web-manual-evidence/AI_EMERGENCY_WALLET_LOYALTY_RETURNS_MANUAL_REVIEW_2026-08-26.md | CTA→contract→authz→authoritative data→all state branches→tests/runtime/ops evidence. |

### 3.reviews — `P1` — Cross-cutting / source reconciliation

**Required journey scenario:** complete exact CTA → contract → authz → authoritative data → real result/error/recovery; no source evidence of backend behavior is assumed

| ID | Mobile-origin route / required Web surface | Build status | Source finding / boundary | Required completion definition |
|---|---|---|---|---|
| PM-220 | `reviews/index` | BUILD | No corresponding localized Web discovery/payment/support surface or CTA found. Evidence: audit-artifacts/gap-closure-audit/patient-web-manual-evidence/GENERAL_DISCOVERY_PAYMENT_SUPPORT_MANUAL_REVIEW_2026-08-26.md | CTA→contract→authz→authoritative data→all state branches→tests/runtime/ops evidence. |

### 3.room — `P0` — Video call

**Required journey scenario:** booking entitlement → one-time scoped token → room join/device failure → leave/end/audit/retention

| ID | Mobile-origin route / required Web surface | Build status | Source finding / boundary | Required completion definition |
|---|---|---|---|---|
| PM-221 | `room/[id]` | BUILD | No corresponding localized Web discovery/payment/support surface or CTA found. Evidence: audit-artifacts/gap-closure-audit/patient-web-manual-evidence/GENERAL_DISCOVERY_PAYMENT_SUPPORT_MANUAL_REVIEW_2026-08-26.md | CTA→contract→authz→authoritative data→all state branches→tests/runtime/ops evidence. |

### 3.s — `P1` — Cross-cutting / source reconciliation

**Required journey scenario:** complete exact CTA → contract → authz → authoritative data → real result/error/recovery; no source evidence of backend behavior is assumed

| ID | Mobile-origin route / required Web surface | Build status | Source finding / boundary | Required completion definition |
|---|---|---|---|---|
| PM-222 | `s/[type]/[slug]` | BUILD | No corresponding localized Web discovery/payment/support surface or CTA found. Evidence: audit-artifacts/gap-closure-audit/patient-web-manual-evidence/GENERAL_DISCOVERY_PAYMENT_SUPPORT_MANUAL_REVIEW_2026-08-26.md | CTA→contract→authz→authoritative data→all state branches→tests/runtime/ops evidence. |

### 3.search — `P1` — Search

**Required journey scenario:** authorized query → result provenance/ranking → PII-safe logging → empty/error/no-result

| ID | Mobile-origin route / required Web surface | Build status | Source finding / boundary | Required completion definition |
|---|---|---|---|---|
| PM-223 | `search/index` | BUILD | No corresponding localized Web discovery/payment/support surface or CTA found. Evidence: audit-artifacts/gap-closure-audit/patient-web-manual-evidence/GENERAL_DISCOVERY_PAYMENT_SUPPORT_MANUAL_REVIEW_2026-08-26.md | CTA→contract→authz→authoritative data→all state branches→tests/runtime/ops evidence. |

### 3.services — `P0` — Service directory

**Required journey scenario:** published provider/service capability/availability → typed handoff to correct journey

| ID | Mobile-origin route / required Web surface | Build status | Source finding / boundary | Required completion definition |
|---|---|---|---|---|
| PM-019 | `(tabs)/services` | BUILD | No general services-directory route/CTA found. Evidence: audit-artifacts/gap-closure-audit/patient-web-manual-evidence/FINAL_ONBOARDING_DIAGNOSTICS_HEALTH_ROOT_MANUAL_REVIEW_2026-08-26.md | CTA→contract→authz→authoritative data→all state branches→tests/runtime/ops evidence. |
| PM-224 | `services/index` | BUILD | No corresponding localized Web discovery/payment/support surface or CTA found. Evidence: audit-artifacts/gap-closure-audit/patient-web-manual-evidence/GENERAL_DISCOVERY_PAYMENT_SUPPORT_MANUAL_REVIEW_2026-08-26.md | CTA→contract→authz→authoritative data→all state branches→tests/runtime/ops evidence. |

### 3.settings — `P0` — Privacy/security controls

**Required journey scenario:** display → actionable control → confirmation/re-auth where needed → audited server mutation → result/recovery

| ID | Mobile-origin route / required Web surface | Build status | Source finding / boundary | Required completion definition |
|---|---|---|---|---|
| PM-225 | `settings/about` | BUILD | No localized about settings route/CTA found. Evidence: audit-artifacts/gap-closure-audit/patient-web-manual-evidence/SETTINGS_PRIVACY_SECURITY_DATA_MANUAL_REVIEW_2026-08-26.md | CTA→contract→authz→authoritative data→all state branches→tests/runtime/ops evidence. |
| PM-226 | `settings/data` | BUILD | Storage summary is read-only; no export/delete/retention control exists. Evidence: audit-artifacts/gap-closure-audit/patient-web-manual-evidence/SETTINGS_PRIVACY_SECURITY_DATA_MANUAL_REVIEW_2026-08-26.md | CTA→contract→authz→authoritative data→all state branches→tests/runtime/ops evidence. |
| PM-227 | `settings/feedback` | BUILD | No feedback route/form/mutation found. Evidence: audit-artifacts/gap-closure-audit/patient-web-manual-evidence/SETTINGS_PRIVACY_SECURITY_DATA_MANUAL_REVIEW_2026-08-26.md | CTA→contract→authz→authoritative data→all state branches→tests/runtime/ops evidence. |
| PM-228 | `settings/help` | BUILD | No help route/CTA found. Evidence: audit-artifacts/gap-closure-audit/patient-web-manual-evidence/SETTINGS_PRIVACY_SECURITY_DATA_MANUAL_REVIEW_2026-08-26.md | CTA→contract→authz→authoritative data→all state branches→tests/runtime/ops evidence. |
| PM-229 | `settings/index` | COMPLETE_OR_REPLACE | Protected settings summary exists but has no management controls. Evidence: audit-artifacts/gap-closure-audit/patient-web-manual-evidence/SETTINGS_PRIVACY_SECURITY_DATA_MANUAL_REVIEW_2026-08-26.md | CTA→contract→authz→authoritative data→all state branches→tests/runtime/ops evidence. |
| PM-230 | `settings/language` | BUILD | No language settings route/control found. Evidence: audit-artifacts/gap-closure-audit/patient-web-manual-evidence/SETTINGS_PRIVACY_SECURITY_DATA_MANUAL_REVIEW_2026-08-26.md | CTA→contract→authz→authoritative data→all state branches→tests/runtime/ops evidence. |
| PM-231 | `settings/notifications-settings` | BUILD | Notification settings render status labels only; no update/device/channel/delivery control is evidenced. Evidence: audit-artifacts/gap-closure-audit/patient-web-manual-evidence/PHI_CONTENT_NOTIFICATIONS_CHAT_MENTAL_HEALTH_MANUAL_REVIEW_2026-08-26.md | CTA→contract→authz→authoritative data→all state branches→tests/runtime/ops evidence. |
| PM-232 | `settings/notifications` | BUILD | Notification surfaces are summaries; no update/device/delivery control is evidenced. Evidence: audit-artifacts/gap-closure-audit/patient-web-manual-evidence/SETTINGS_PRIVACY_SECURITY_DATA_MANUAL_REVIEW_2026-08-26.md | CTA→contract→authz→authoritative data→all state branches→tests/runtime/ops evidence. |
| PM-233 | `settings/privacy` | BUILD | Privacy booleans are read-only; no update/revocation/consent control exists. Evidence: audit-artifacts/gap-closure-audit/patient-web-manual-evidence/SETTINGS_PRIVACY_SECURITY_DATA_MANUAL_REVIEW_2026-08-26.md | CTA→contract→authz→authoritative data→all state branches→tests/runtime/ops evidence. |
| PM-234 | `settings/security` | BUILD | Security/session summaries are read-only; no 2FA/session revoke/device recovery control exists. Evidence: audit-artifacts/gap-closure-audit/patient-web-manual-evidence/SETTINGS_PRIVACY_SECURITY_DATA_MANUAL_REVIEW_2026-08-26.md | CTA→contract→authz→authoritative data→all state branches→tests/runtime/ops evidence. |
| PM-235 | `settings/support-chat` | BUILD | No support-chat settings route/CTA found. Evidence: audit-artifacts/gap-closure-audit/patient-web-manual-evidence/SETTINGS_PRIVACY_SECURITY_DATA_MANUAL_REVIEW_2026-08-26.md | CTA→contract→authz→authoritative data→all state branches→tests/runtime/ops evidence. |
| PM-236 | `settings/terms` | BUILD | No terms settings route/CTA found. Evidence: audit-artifacts/gap-closure-audit/patient-web-manual-evidence/SETTINGS_PRIVACY_SECURITY_DATA_MANUAL_REVIEW_2026-08-26.md | CTA→contract→authz→authoritative data→all state branches→tests/runtime/ops evidence. |

### 3.shared — `P1` — Cross-cutting / source reconciliation

**Required journey scenario:** complete exact CTA → contract → authz → authoritative data → real result/error/recovery; no source evidence of backend behavior is assumed

| ID | Mobile-origin route / required Web surface | Build status | Source finding / boundary | Required completion definition |
|---|---|---|---|---|
| PM-237 | `shared/location-picker` | BUILD | No corresponding localized Web discovery/payment/support surface or CTA found. Evidence: audit-artifacts/gap-closure-audit/patient-web-manual-evidence/GENERAL_DISCOVERY_PAYMENT_SUPPORT_MANUAL_REVIEW_2026-08-26.md | CTA→contract→authz→authoritative data→all state branches→tests/runtime/ops evidence. |

### 3.support — `P0` — Support

**Required journey scenario:** identity verification → case/attachment policy → queue/SLA → resolution/escalation/audit

| ID | Mobile-origin route / required Web surface | Build status | Source finding / boundary | Required completion definition |
|---|---|---|---|---|
| PM-238 | `support/chat` | BUILD | Thread surface renders summary metadata and hides body; no support-chat compose/escalation CTA is evidenced. Evidence: audit-artifacts/gap-closure-audit/patient-web-manual-evidence/PHI_CONTENT_NOTIFICATIONS_CHAT_MENTAL_HEALTH_MANUAL_REVIEW_2026-08-26.md | CTA→contract→authz→authoritative data→all state branches→tests/runtime/ops evidence. |
| PM-239 | `support/ticket` | BUILD | No corresponding localized Web discovery/payment/support surface or CTA found. Evidence: audit-artifacts/gap-closure-audit/patient-web-manual-evidence/GENERAL_DISCOVERY_PAYMENT_SUPPORT_MANUAL_REVIEW_2026-08-26.md | CTA→contract→authz→authoritative data→all state branches→tests/runtime/ops evidence. |

### 3.voice — `P1` — Voice

**Required journey scenario:** consent → capture/transcribe → PII minimization → action confirmation → failure/delete/audit

| ID | Mobile-origin route / required Web surface | Build status | Source finding / boundary | Required completion definition |
|---|---|---|---|---|
| PM-240 | `voice/index` | BUILD | No corresponding localized Web discovery/payment/support surface or CTA found. Evidence: audit-artifacts/gap-closure-audit/patient-web-manual-evidence/GENERAL_DISCOVERY_PAYMENT_SUPPORT_MANUAL_REVIEW_2026-08-26.md | CTA→contract→authz→authoritative data→all state branches→tests/runtime/ops evidence. |

### 3.wallet — `P1` — Ledger wallet

**Required journey scenario:** funding/transfer/transaction → policy/risk → immutable ledger → reconciliation/receipt/dispute

| ID | Mobile-origin route / required Web surface | Build status | Source finding / boundary | Required completion definition |
|---|---|---|---|---|
| PM-241 | `wallet/cards` | BUILD | No localized Web wallet feature surface/CTA found. Evidence: audit-artifacts/gap-closure-audit/patient-web-manual-evidence/AI_EMERGENCY_WALLET_LOYALTY_RETURNS_MANUAL_REVIEW_2026-08-26.md | CTA→contract→authz→authoritative data→all state branches→tests/runtime/ops evidence. |
| PM-242 | `wallet/hub` | BUILD | No localized Web wallet feature surface/CTA found. Evidence: audit-artifacts/gap-closure-audit/patient-web-manual-evidence/AI_EMERGENCY_WALLET_LOYALTY_RETURNS_MANUAL_REVIEW_2026-08-26.md | CTA→contract→authz→authoritative data→all state branches→tests/runtime/ops evidence. |
| PM-243 | `wallet/topup` | BUILD | No localized Web wallet feature surface/CTA found. Evidence: audit-artifacts/gap-closure-audit/patient-web-manual-evidence/AI_EMERGENCY_WALLET_LOYALTY_RETURNS_MANUAL_REVIEW_2026-08-26.md | CTA→contract→authz→authoritative data→all state branches→tests/runtime/ops evidence. |
| PM-244 | `wallet/transactions` | BUILD | No localized Web wallet feature surface/CTA found. Evidence: audit-artifacts/gap-closure-audit/patient-web-manual-evidence/AI_EMERGENCY_WALLET_LOYALTY_RETURNS_MANUAL_REVIEW_2026-08-26.md | CTA→contract→authz→authoritative data→all state branches→tests/runtime/ops evidence. |
| PM-245 | `wallet/transfer` | BUILD | No localized Web wallet feature surface/CTA found. Evidence: audit-artifacts/gap-closure-audit/patient-web-manual-evidence/AI_EMERGENCY_WALLET_LOYALTY_RETURNS_MANUAL_REVIEW_2026-08-26.md | CTA→contract→authz→authoritative data→all state branches→tests/runtime/ops evidence. |

### 3.wearables — `P1-SAFETY` — Wearables

**Required journey scenario:** OS permission → encrypted sync → provenance/freshness/conflict → revoke/delete → clinical-safe display

| ID | Mobile-origin route / required Web surface | Build status | Source finding / boundary | Required completion definition |
|---|---|---|---|---|
| PM-246 | `wearables/hub` | BUILD | No corresponding localized Web discovery/payment/support surface or CTA found. Evidence: audit-artifacts/gap-closure-audit/patient-web-manual-evidence/GENERAL_DISCOVERY_PAYMENT_SUPPORT_MANUAL_REVIEW_2026-08-26.md | CTA→contract→authz→authoritative data→all state branches→tests/runtime/ops evidence. |

## 4. logical screens required for complete launched journeys

These screens are required even when the old route inventory did not name them, because a production state machine is incomplete without them.

| Journey | Required additional screens/states | Why it cannot be omitted | Priority |
|---|---|---|---|
| Pharmacy | address/serviceability; Rx review status; broadcast waiting; no eligible pharmacy; offers compare; substitution consent; selected-offer expiry; payment processing/failure; insurance decision/co-pay; fulfilment timeline; issue/return/refund/dispute; receipt. | Each is a material state transition, financial guard or recovery path. | P0 |
| Bookings | slot hold expiry; quote change; payment processing/failure; payer decision/co-pay/reject; confirmed receipt; provider cancellation; patient cancel/reschedule; no-show; call device/check/waiting; visit/diagnostic prep; result amendment; support. | A booking cannot be truthful with only discovery and success pages. | P0 |
| Identity/PHI | signup/social only if contracted; verification retry/locked/expired; device/session manage; re-auth for sensitive action; consent history/revoke; delegation scope/revoke; export/delete status. | Privacy, account recovery and ownership require user-visible recovery/control states. | P0 |
| Provider | offer/booking work queues; claim/co-pay action; capacity/stock conflict; fulfillment/visit evidence; payout/recon; incident/support queue. | Patient journeys stop if provider cannot operate every required transition. | P0 |
| Admin | approval/revoke; exception/dispute; financial reconcile; access audit; consent/data request; clinical/content incident; SLA queue. | A platform cannot safely operate exceptions through database/manual side channels. | P0 |
| Support | identity verification; case creation; PHI-safe attachment; status/SLA; escalation; resolution/feedback. | Users need safe recovery from all failed financial/clinical/operational scenarios. | P0 |

## 5. Provider build matrix — audit-first, then implementation

Provider source read is not runtime/contract readiness. The following rows define the required screen/scenario catalog; every row remains `AUDIT_FIRST` until the Provider route/CTA/contract review identifies its exact existing/missing surface.

| Provider module | Required routes/screens/actions | Required scenarios | Contract/operations owner | Status |
|---|---|---|---|---|
| Organization onboarding | registration, legal/KYC, branch/service zone, license/credential, bank/payout, approval/denial/renewal. | pending/approved/rejected/expired/revoke/resubmit. | Admin governance + IAM + Finance. | AUDIT_FIRST |
| Staff and roles | staff list, invite, role/branch assignment, shift/availability, suspend/remove, credential expiry. | invite expiry, least privilege, offboarding, tenant denial. | IAM/tenant/audit. | AUDIT_FIRST |
| Catalog/capacity | service/medicine/catalog, price input, inventory, service area, slot capacity, blackout, publish/revoke. | version conflict, stale stock, approval pending, over-capacity. | Catalog/scheduling/admin policy. | AUDIT_FIRST |
| Pharmacy fulfillment | broadcast queue, request detail, offer/substitution, stock reserve, payment/coverage guard, prepare/dispatch/delivery/issue. | offer expiry, patient selects competitor, payer reject, stock conflict, delivery failure. | Pharmacy/order/ledger/payer. | AUDIT_FIRST |
| Clinical/booking delivery | appointment queue, accept/reject, slot updates, call/visit, notes/result, referral/follow-up. | no-show, reschedule, clinical escalation, result correction. | Booking/call/clinical documents. | AUDIT_FIRST |
| Home-care/nursing | assignment, route/arrival, task checklist, visit state, completion proof, supervisor escalation. | unsafe address, staff late, task exception, patient unavailable. | Assignment/operations/clinical safety. | AUDIT_FIRST |
| Insurance/finance | eligibility/decision/co-pay, invoices, payout statement, reconciliation, dispute. | full/partial/reject, settlement mismatch, adjustment approval. | Payer/ledger/admin finance. | AUDIT_FIRST |
| Support/quality | SLA work queue, support messages, complaints, incidents, scorecard. | PHI-safe escalation, policy breach, audit/review. | Support/safety/operations. | AUDIT_FIRST |

## 6. Admin build matrix — audit-first, then implementation

| Admin module | Required routes/screens/actions | Required scenarios | Control requirement | Status |
|---|---|---|---|---|
| Admin IAM | login/MFA, role/permission, privileged session, access review, break-glass. | step-up/revoke/denied/expiry/break-glass review. | least privilege, MFA, immutable audit. | AUDIT_FIRST |
| Provider governance | organization/branch/staff/license/service approval, suspend/revoke, appeal. | pending/reject/expiry/renewal/dispute. | dual control/reason/evidence/notification. | AUDIT_FIRST |
| Operations command | booking/order/offer/visit/call exception queues, SLA, reassignment/escalation. | stuck/late/no-offer/no-show/provider outage. | role/action/time/reason audit. | AUDIT_FIRST |
| Finance command | payments/webhooks/ledger/reconciliation/COD/payout/refund/dispute. | mismatch/replay/duplicate/refund approval/settlement. | segregation of duties and finance approval. | AUDIT_FIRST |
| Payer command | policy/payer exception, co-pay review, reason codes, claim escalation. | partial/reject/expired/conflict. | consent and payer decision audit. | AUDIT_FIRST |
| Privacy/security | audit search, consent/data request, incident/case, risk/access alerts. | unauthorized access, deletion/export, breach response. | restricted PHI view, retention and audit. | AUDIT_FIRST |
| Clinical/content safety | content review, AI review signals, clinical incident, emergency record, moderation. | unsafe content, escalation, publish/revoke. | clinical owner and safety audit. | AUDIT_FIRST |
| Support/analytics | support cases, QA, feedback taxonomy, governed KPIs. | PHI-safe handling, metric data quality, export restrictions. | data lineage and access controls. | AUDIT_FIRST |

## 7. Contract slice template for every screen/CTA

```text
slice_id / product / actor / exact route-screen / entry-state
CTA label + enabled guard + next state
request method/path or event + payload + idempotency/concurrency
response/error/status schema + loading/empty/error/offline/denied/expired UI
backend controller/service/DTO/schema/state transition
authorization/tenant/ownership/delegation rule
authoritative price/stock/slot/payer/clinical source and freshness
payment/ledger/COD/co-pay semantics where relevant
provider/admin/support action, notification/result/audit events
tests: owner/stranger/unauth + negative/race/replay/runtime + observability
```

## 8. Release prioritization

| Bucket | What enters | Release rule |
|---|---|---|
| P0 Foundation | IAM/PHI/audit, contracts, ledger/PSP/payer, pharmacy, booking, provider/admin operations, support. | Required before general public release. |
| P0-SAFETY | emergency, AI, mental health, medication scanning, clinical claims. | Disabled until independent safety pack and operational drill close. |
| P1 Complete experience | health workspace expansion, content, reviews/community, loyalty/wallet, wearables, voice, advanced discovery. | After P0 stability and each domain contract. |
| P2 Growth | experimental campaigns, advanced automation, nonessential personalization. | Only after governance, privacy, performance and support capacity prove ready. |

## 9. References

[1]: `PATIENT_WEB_TO_MOBILE_PARITY_REGISTER_2026-08-26.tsv` — source of exact Web missing/partial rows.
[2]: `PATIENT_MOBILE_SOURCE_REVIEW_CONSOLIDATION_2026-08-26.md` — source of Mobile correction clusters and evidence limits.
[3]: `NABD_FULL_PRODUCTION_TRANSFORMATION_BLUEPRINT_2026-08-26.md` — overarching production transformation blueprint.
