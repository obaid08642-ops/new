# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `audit-artifacts/NABDAH_PASTED_CONTENT_17_REQUIREMENTS_ANALYSIS_20260818.md`
- **Member SHA-256:** `d7a49c6645a4d703f217cab386eae51deb9eb4deada80e0cf0dd55e81ab71dcf`
- **Line count:** 70
- **Read range:** `1-70`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `41: يجب توفير وصف نصي للمشكلة ورفع صور أو تحاليل أو ملفات مرتبطة بالخدمة، مع تحقق من النوع والحجم والخصوصية وحالة الرفع. يجب أن يظهر للمزود ما تمت مشاركته فقط، مع سجل وصول، وحالات upload/loading/failure/retry.`
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- `31: ينبغي فتح نافذة chat قبل الموعد وفق سياسة زمنية واضحة، مثلاً قبل الموعد بمدة محددة، وإغلاقها بعد انتهاء النافذة المسموح بها. يجب اختبار صلاحية العضوية والـownership، وعدم السماح لمستخدم مصادق بالانضمام إلى thread لا يخصه.`
- `65: | قناة الاتصال | لا يكفي فتح الاتصال زمنياً؛ يجب ربطها بالموافقة/الدفع، الموعد، المشاركين، origin، token، ownership، وحالة الخدمة. |`
### state_transitions
- `35: شاشة الاتصال يجب أن تغطي video on/off، microphone mute/unmute، speaker، voice-only، تبديل الكاميرا، ملء الشاشة وتصغيرها، chat، رفع الملفات، reconnect، network failure، end call، rejection، no-show، وعودة التطبيق من الخلفية. كل إجراء يجب أن `
- `41: يجب توفير وصف نصي للمشكلة ورفع صور أو تحاليل أو ملفات مرتبطة بالخدمة، مع تحقق من النوع والحجم والخصوصية وحالة الرفع. يجب أن يظهر للمزود ما تمت مشاركته فقط، مع سجل وصول، وحالات upload/loading/failure/retry.`
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- `41: يجب توفير وصف نصي للمشكلة ورفع صور أو تحاليل أو ملفات مرتبطة بالخدمة، مع تحقق من النوع والحجم والخصوصية وحالة الرفع. يجب أن يظهر للمزود ما تمت مشاركته فقط، مع سجل وصول، وحالات upload/loading/failure/retry.`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
