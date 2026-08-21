# Phase 7 — Insurance Claims Read-only

تمت إضافة surface Claims إلى صفحة Insurance اعتمادًا على Backend GET الحقيقي `/insurance/claims`، الذي يقرأ claims المملوكة للمريض عبر `patient_id` من الجلسة. لم تُنقل عمليات `POST /claims/submit` أو upload أو appeal أو payment أو refund.

الـparser يسمح فقط بـ `id`, `service`, `status`, و`date`. يتم إسقاط `patient_id`, `amount`, `covered`, documents وأي حقول إضافية. الواجهة تعرض حالة claim وخدمته وتاريخه فقط، مع ترجمة لكل اللغات الست.

تمت إضافة المسار إلى BFF GET-only allowlist، مع server wrapper يستخدم httpOnly session access داخليًا. لا يُعرض token في المتصفح.

التحقق: Claims/Insurance tests نجحت، full Vitest: 65 files passed و14 skipped، 119 tests passed و23 skipped، truthful gate على 195 production files، TypeScript، production build، وdiff check.

حدود صادقة: لا يوجد في هذه slice submit claim أو document upload أو rejection reason أو amount breakdown أو refund/payment action.
