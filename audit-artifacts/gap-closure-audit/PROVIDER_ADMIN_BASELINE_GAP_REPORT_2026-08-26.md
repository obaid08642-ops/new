# Provider and Admin: baseline gap report

## الحكم الصريح

القول بأن Provider وAdmin جاهزان أو مكتملان غير مدعوم حاليًا. يوجد source فعلي لكل منهما، لكن لا توجد completion matrix تثبت role-specific onboarding أو fulfillment أو insurance أو finance أو security أو الحالة السلبية لكل شاشة وCTA. لذلك لا ينبغي أن يتحول وجود ملفات Dashboard أو Screens إلى ادعاء أن رحلة مزوّد أو إدارة مكتملة.

| السطح | مكوّنات screen/page المرشحة | action signal | state signal | غير مراجع يدويًا | النتيجة |
|---|---:|---:|---:|---:|---|
| Provider | 45 | 44 | 37 | 45 | source موجود، لكن اكتمال الدور والـcontract والحالات غير مثبت |
| Admin | 42 | 30 | 30 | 42 | source موجود، لكن RBAC/audit/finance/ops completion غير مثبت |

## Provider: أدلة تستوجب gap review

توجد ملفات واضحة لمسارات مختلفة مثل `AuthScreens` و`PendingDashboard` وDoctor/Pharmacy/Lab/Radiology/Nursing/Ambulance/Facility dashboards وregistration screens. لكن الجرد يترك كل هذه الملفات بحالة:

```text
role_matrix_status=NOT_YET_MANUALLY_REVIEWED
cta_inventory_status=NOT_YET_MANUALLY_REVIEWED
scenario_matrix_status=NOT_YET_MANUALLY_REVIEWED
contract_status=NOT_RECONCILED
data_source_status=NOT_REVIEWED
security_review_status=NOT_REVIEWED
```

كما ظهرت أربع إشارات source ثابتة تحتاج تدقيقًا خاصًا؛ ليست كلها defects مؤكدة من النص وحده، لكن لا يجوز تجاهلها:

| ID | المسار | السطر/الأسطر | الدليل | المعالجة المطلوبة |
|---|---|---|---|---|
| PR-005 | `src/screens/doctor/DoctorDashboard.tsx` | 2092, 2104, 3189, 4224 | إشارات mock/blueprint وفق scan | مراجعة كل state وdata source وربطه بعقد خادمي أو test-only fixture |
| PR-031 | `src/screens/pharmacy/PharmacyDashboard.tsx` | 216 | تعليق `Simulated WebSocket connection for Live Radar (Polling fallback)` | contract review: event/poll endpoint، auth، geo scope، offer idempotency، reconnect/empty/error، وعدم عرض broadcast وهمي |
| PR-035 | `src/screens/shared/BlueprintScreens.tsx` | 5 | ملف blueprint صريح | تفكيك محتواه screen-by-screen؛ كل مكوّن يثبت production contract أو يصنف skeleton/remove |
| PR-045 | `src/screens/shared/VideoCallRoom.tsx` | 9,10 | إشارات mock/blueprint وفق scan | تدقيق call token/room authorization/expiry/recording/privacy/network failure |

## Provider completion matrix المطلوبة

لا يغلق مزوّد واحد بنجاح تسجيل الدخول فقط. يجب أن تغطي كل provider type: Pharmacy وDoctor وLab وRadiology وNursing/Home-care وFacility وAmbulance، وتوثق:

1. التسجيل، role selection، KYC/license/facility binding، pending/approved/rejected/expired؛
2. dashboard ببيانات خادمية حقيقية لا counters أو lists محلية؛
3. inbox/request broadcast مع ownership/geo/eligibility؛
4. quote أو slot أو acceptance أو clinical/field action بحسب الدور؛
5. price/stock/substitution/ETA أو availability من source-of-truth؛
6. insurance full/partial/reject/co-pay مع policy version وaudit trail؛
7. fulfillment/visit/sample/result/report/hand-off؛
8. COD/collection/payout/reconciliation/dispute حيث ينطبق؛
9. chat/notification/call/token/result مع PHI scope؛
10. cancellation, retry, timeout, duplicate, wrong role, tenant isolation, offline/reconnect؛
11. settings, staff/delegation, hours, locations, documents, privacy/export/deletion حيث ينطبق.

## Admin completion matrix المطلوبة

لا تكفي 42 صفحة Admin لإثبات enterprise control plane. لكل صفحة admin يجب تحديد role، authorization decision، data scope، audit event، maker-checker/approval عند اللزوم، prevention of destructive actions، وincident/rollback path.

يجب أن تغطي مصفوفة Admin على الأقل: RBAC/elevation، provider onboarding/moderation، catalog/publication، insurance configuration/queue، order/booking exception queues، financial ledger/payout/refund/dispute، support/escalation، SOS/ambulance، security/device/session/audit logs، notification governance، retention/export/deletion، analytics المبنية على بيانات صحيحة، release/feature flag/rollback visibility.

## الحد الفاصل

لا يعني هذا التقرير أن كل Provider أو Admin feature معيبة؛ بل يثبت أن **اكتمالها غير موثق** وأن بعض source signals تتطلب gap review محدد. لا تتحول إلى confirmed defect أو build task إلا بعد screen/CTA/contract/state review وتحديد دليل حقيقي.
