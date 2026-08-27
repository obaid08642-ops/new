# بطاقات معالجة أسطح مزوّد الخدمة غير المكتملة

| البطاقة | الجذور المحددة | مانع الإتاحة | تعريف الإغلاق |
|---|---|---|---|
| DOC-01 الاستشارات | `src/screens/shared/ProviderHome.tsx`، `LiveKitRoomProvider.tsx`، routes calls | لا دليل server-authoritative slot/capacity/payment/insurance/EHR/audit | عقد appointment/provider/facility، payment/insurance gate، LiveKit token purpose/audit، integration معزول. |
| LAB-01 المختبر | `src/screens/lab/LabDashboard.tsx`، routes lab | chain-of-custody/consent/private storage/payment غير مثبت | أمر report مملوك، storage scoped، consent/audit، state tests. |
| RAD-01 الأشعة | `src/screens/radiology/RadiologyDashboard.tsx`، routes radiology | coverage/report/catalog UI لا يثبت authority أو lifecycle | ownership، appointment capacity، consent، report custody وpayment gate. |
| NUR-01 التمريض | `src/screens/nursing/NursingDashboard.tsx`، home-care routes | location/signature/cash collection محلية أو غير مثبتة | assignment/visit state، verified location purpose، evidence policy وpayment gate. |
| EMS-01 الإسعاف | emergency surfaces/routes | dispatch/mission/location authority غير مكتمل | dispatch authority، resource identity، audit/location controls واختبارات transitions. |
| ONB-01 onboarding/facility | `src/api/provider.ts`، provider settings | KYC/storage/moderation/facility lifecycle غير مثبت end-to-end | private document access، moderation states، approved facility binding. |
| PAY-01 payout | wallet/withdrawal surfaces، finance ledger | earning/settlement/bank approval/reconciliation غير مكتمل | settled ledger business keys، bank approval، withdrawal idempotency وpayout lifecycle. |

> إلى أن تتحقق تعريفات الإغلاق، لا ينبغي أن يقدم أي CTA نجاحاً محلياً أو يؤكد إنجازاً للمستخدم.
