# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `audit-artifacts/DEPLOYMENT_AND_POST_DEPLOY_GATE_20260818.md`
- **Member SHA-256:** `4abbd37b6645555f444132453f89718261cab78167acfe47632fe225f0fe5376`
- **Line count:** 33
- **Read range:** `1-33`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `13: تُختبر المصادقة sandbox، profile، catalog، service directory، provider availability، patient timeline، notifications list، wallet read، family list، admin login، وكل route عام/محمي أساسي. تُسجل الاستجابة والزمن والنسخة، ولا تُستخدم بيانات ح`
- `17: لكل نوع مزود متاح: doctor، lab، radiology، pharmacy، nursing، hospital/facility، ambulance، يُنفذ login/onboarding state ثم online/availability، وصول broadcast أو queue، inbox rendering، accept، reject، timeout، reassign، transition، patien`
- `25: تُختبر RBAC والاعتمادات والمستخدمون والمزودون والمنشآت والكتالوج والأدوية والطلبات والحجوزات والـbroadcast والتأمين والدفع والـpayouts والـledger والتقارير والتمريض والإسعاف والإشعارات وaudit logs والتصدير والتأكيدات قبل العمليات الحساسة. ل`
- `29: لكل سيناريو تحفظ الخطوات، الحساب، endpoint، payload المنقح، status/body، معرف الكيان، الحالة قبل/بعد، screenshot أو log عند الحاجة، ونتيجة ownership. تكون النتيجة PASS فقط عند اكتمال source + automated + live evidence؛ وFAIL عند العيب؛ وBLO`
- `33: لا تُستخدم حسابات حقيقية، ولا تُنشأ refunds أو بطاقات أو تحويلات حقيقية، ولا تُفعّل عقود consent/QR/emergency-location غير المعتمدة، ولا يُعتمد build محلي أو health 200 وحده كدليل على نشر الإصلاح.`
### backend_consumers_or_contracts
- `21: تُنفذ الاستشارات أونلاين/عيادة/منزل مع cash/card/insurance، والصيدلية delivery/pickup/refill، والمختبر branch/home، والأشعة branch/home، والتمريض home visit، والمستشفى، مع إنشاء الطلب والتوجيه والقبول والتنفيذ والتقرير والإلغاء والتقييم وال`
### auth_ownership
- `5: يُسجّل المدقق commit المصدر `41d1103`، hash كل archive، نسخة قاعدة البيانات، وسيلة rollback، ووقت بدء النشر. يجب التأكد أن أصول Patient App وProvider App وAdmin Dashboard والـbackend التي ستُبنى هي نفسها الأصول المعتمدة في سجل النسخ، لا sna`
- `13: تُختبر المصادقة sandbox، profile، catalog، service directory، provider availability، patient timeline، notifications list، wallet read، family list، admin login، وكل route عام/محمي أساسي. تُسجل الاستجابة والزمن والنسخة، ولا تُستخدم بيانات ح`
- `17: لكل نوع مزود متاح: doctor، lab، radiology، pharmacy، nursing، hospital/facility، ambulance، يُنفذ login/onboarding state ثم online/availability، وصول broadcast أو queue، inbox rendering، accept، reject، timeout، reassign، transition، patien`
- `23: ## 6. Admin Dashboard`
- `29: لكل سيناريو تحفظ الخطوات، الحساب، endpoint، payload المنقح، status/body، معرف الكيان، الحالة قبل/بعد، screenshot أو log عند الحاجة، ونتيجة ownership. تكون النتيجة PASS فقط عند اكتمال source + automated + live evidence؛ وFAIL عند العيب؛ وBLO`
### state_transitions
- `9: يُتحقق من SHA/release identifier داخل السيرفر، ثم تُفحص liveness وreadiness. نتيجة liveness الحالية عبر origin هي 200، لكن readiness كانت 500؛ لذلك لا يبدأ E2E حتى تُفسر readiness وتصبح سليمة أو يقدّم المدقق قراراً موثقاً يحدد سبب الاستثناء`
- `17: لكل نوع مزود متاح: doctor، lab، radiology، pharmacy، nursing، hospital/facility، ambulance، يُنفذ login/onboarding state ثم online/availability، وصول broadcast أو queue، inbox rendering، accept، reject، timeout، reassign، transition، patien`
- `21: تُنفذ الاستشارات أونلاين/عيادة/منزل مع cash/card/insurance، والصيدلية delivery/pickup/refill، والمختبر branch/home، والأشعة branch/home، والتمريض home visit، والمستشفى، مع إنشاء الطلب والتوجيه والقبول والتنفيذ والتقرير والإلغاء والتقييم وال`
- `25: تُختبر RBAC والاعتمادات والمستخدمون والمزودون والمنشآت والكتالوج والأدوية والطلبات والحجوزات والـbroadcast والتأمين والدفع والـpayouts والـledger والتقارير والتمريض والإسعاف والإشعارات وaudit logs والتصدير والتأكيدات قبل العمليات الحساسة. ل`
- `29: لكل سيناريو تحفظ الخطوات، الحساب، endpoint، payload المنقح، status/body، معرف الكيان، الحالة قبل/بعد، screenshot أو log عند الحاجة، ونتيجة ownership. تكون النتيجة PASS فقط عند اكتمال source + automated + live evidence؛ وFAIL عند العيب؛ وBLO`
- `33: لا تُستخدم حسابات حقيقية، ولا تُنشأ refunds أو بطاقات أو تحويلات حقيقية، ولا تُفعّل عقود consent/QR/emergency-location غير المعتمدة، ولا يُعتمد build محلي أو health 200 وحده كدليل على نشر الإصلاح.`
### payment_insurance_relevance
- `13: تُختبر المصادقة sandbox، profile، catalog، service directory، provider availability، patient timeline، notifications list، wallet read، family list، admin login، وكل route عام/محمي أساسي. تُسجل الاستجابة والزمن والنسخة، ولا تُستخدم بيانات ح`
- `17: لكل نوع مزود متاح: doctor، lab، radiology، pharmacy، nursing، hospital/facility، ambulance، يُنفذ login/onboarding state ثم online/availability، وصول broadcast أو queue، inbox rendering، accept، reject، timeout، reassign، transition، patien`
- `21: تُنفذ الاستشارات أونلاين/عيادة/منزل مع cash/card/insurance، والصيدلية delivery/pickup/refill، والمختبر branch/home، والأشعة branch/home، والتمريض home visit، والمستشفى، مع إنشاء الطلب والتوجيه والقبول والتنفيذ والتقرير والإلغاء والتقييم وال`
- `25: تُختبر RBAC والاعتمادات والمستخدمون والمزودون والمنشآت والكتالوج والأدوية والطلبات والحجوزات والـbroadcast والتأمين والدفع والـpayouts والـledger والتقارير والتمريض والإسعاف والإشعارات وaudit logs والتصدير والتأكيدات قبل العمليات الحساسة. ل`
- `29: لكل سيناريو تحفظ الخطوات، الحساب، endpoint، payload المنقح، status/body، معرف الكيان، الحالة قبل/بعد، screenshot أو log عند الحاجة، ونتيجة ownership. تكون النتيجة PASS فقط عند اكتمال source + automated + live evidence؛ وFAIL عند العيب؛ وBLO`
- `33: لا تُستخدم حسابات حقيقية، ولا تُنشأ refunds أو بطاقات أو تحويلات حقيقية، ولا تُفعّل عقود consent/QR/emergency-location غير المعتمدة، ولا يُعتمد build محلي أو health 200 وحده كدليل على نشر الإصلاح.`
### error_empty_loading_retry_cancel
- `17: لكل نوع مزود متاح: doctor، lab، radiology، pharmacy، nursing، hospital/facility، ambulance، يُنفذ login/onboarding state ثم online/availability، وصول broadcast أو queue، inbox rendering، accept، reject، timeout، reassign، transition، patien`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
