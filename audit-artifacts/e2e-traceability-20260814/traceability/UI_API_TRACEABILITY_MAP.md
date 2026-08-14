# خريطة أولية للشاشات والتفاعلات ونقاط API

> هذه خريطة ثابتة مولدة من المصدر المستخرج. لا تثبت نجاح الاستدعاء في runtime؛ كل صف يحتاج لاحقاً إثبات عقد وE2E في staging.

## تغطية الفهرسة

| المكوّن | الشاشات المفهرسة | التفاعلات المرصودة | شاشات تحوي استدعاء API | تحتاج مراجعة |
|---|---:|---:|---:|---:|
| patient | 236 | 2544 | 165 | 144 |
| provider | 39 | 1244 | 29 | 33 |
| admin | 18 | 34 | 15 | 10 |

## كتالوج الخلفية

تمت فهرسة **522** نقطة متحكم خلفي ظاهرة في التحليل الساكن.

## سجل الشاشات

| المكوّن | المسار/الشاشة | مصدر الواجهة | API حرفية مرصودة | تفاعلات | مؤشرات مراجعة |
|---|---|---|---|---:|---|
| patient | `/(auth)/forgot-password` | `patient/nabd plus/app/(auth)/forgot-password.tsx` | `/auth/send-otp` | 7 | مؤشر بيانات بديلة/محاكاة يحتاج مراجعة |
| patient | `/(auth)/login` | `patient/nabd plus/app/(auth)/login.tsx` | `/auth/social-login`<br>`/auth/login` | 27 | مؤشر بيانات بديلة/محاكاة يحتاج مراجعة |
| patient | `/(auth)/otp` | `patient/nabd plus/app/(auth)/otp.tsx` | `/auth/verify-otp`<br>`/auth/register` | 11 | — |
| patient | `/(auth)/privacy` | `patient/nabd plus/app/(auth)/privacy.tsx` | — | 4 | تفاعلات دون عقد API حرفي في الملف |
| patient | `/(auth)/provider-info` | `patient/nabd plus/app/(auth)/provider-info.tsx` | — | 6 | تفاعلات دون عقد API حرفي في الملف |
| patient | `/(auth)/register` | `patient/nabd plus/app/(auth)/register.tsx` | `/auth/social-login`<br>`/auth/send-otp` | 24 | مؤشر بيانات بديلة/محاكاة يحتاج مراجعة |
| patient | `/(auth)/reset-password` | `patient/nabd plus/app/(auth)/reset-password.tsx` | `/auth/reset-password` | 3 | مؤشر بيانات بديلة/محاكاة يحتاج مراجعة |
| patient | `/(auth)/terms` | `patient/nabd plus/app/(auth)/terms.tsx` | — | 4 | تفاعلات دون عقد API حرفي في الملف |
| patient | `/(auth)/welcome` | `patient/nabd plus/app/(auth)/welcome.tsx` | `/auth/guest` | 33 | — |
| patient | `/(onboarding)` | `patient/nabd plus/app/(onboarding)/index.tsx` | — | 7 | تفاعلات دون عقد API حرفي في الملف |
| patient | `/(onboarding)/language` | `patient/nabd plus/app/(onboarding)/language.tsx` | — | 5 | تفاعلات دون عقد API حرفي في الملف |
| patient | `/(onboarding)/permissions` | `patient/nabd plus/app/(onboarding)/permissions.tsx` | — | 8 | تفاعلات دون عقد API حرفي في الملف |
| patient | `/(tabs)/consultations` | `patient/nabd plus/app/(tabs)/consultations/index.tsx` | `/providers?type=doctor` | 59 | مؤشر بيانات بديلة/محاكاة يحتاج مراجعة |
| patient | `/(tabs)/diagnostics` | `patient/nabd plus/app/(tabs)/diagnostics.tsx` | `/labs/packages`<br>`/labs/services`<br>`/radiology/services`<br>`/providers?type=lab` | 51 | مؤشر بيانات بديلة/محاكاة يحتاج مراجعة |
| patient | `/(tabs)/health` | `patient/nabd plus/app/(tabs)/health.tsx` | `/health/vitals/summary`<br>`/users/me/profile`<br>`/home/upcoming-appointment`<br>`/nutrition/daily-summary?date=${new Date().toISOString().split(` | 12 | — |
| patient | `/(tabs)` | `patient/nabd plus/app/(tabs)/index.tsx` | `/home/offers`<br>`/home/upcoming-appointment`<br>`/users/me/profile` | 21 | مؤشر بيانات بديلة/محاكاة يحتاج مراجعة |
| patient | `/(tabs)/nursing` | `patient/nabd plus/app/(tabs)/nursing.tsx` | `/home-care/services`<br>`/home-care/packages` | 30 | مؤشر بيانات بديلة/محاكاة يحتاج مراجعة |
| patient | `/(tabs)/pharmacy` | `patient/nabd plus/app/(tabs)/pharmacy.tsx` | `/medicines/categories`<br>`/medicines?${q.toString()}` | 31 | مؤشر بيانات بديلة/محاكاة يحتاج مراجعة |
| patient | `/(tabs)/services` | `patient/nabd plus/app/(tabs)/services.tsx` | — | 2 | تفاعلات دون عقد API حرفي في الملف |
| patient | `/ai/chat-doctor` | `patient/nabd plus/app/ai/chat-doctor.tsx` | ديناميكي | 12 | مؤشر بيانات بديلة/محاكاة يحتاج مراجعة<br>استدعاء API ديناميكي يحتاج تتبعاً يدوياً<br>تفاعلات دون عقد API حرفي في الملف |
| patient | `/ai/monthly-report` | `patient/nabd plus/app/ai/monthly-report.tsx` | — | 10 | تفاعلات دون عقد API حرفي في الملف |
| patient | `/ai/prescription-translator` | `patient/nabd plus/app/ai/prescription-translator.tsx` | ديناميكي | 15 | استدعاء API ديناميكي يحتاج تتبعاً يدوياً<br>تفاعلات دون عقد API حرفي في الملف |
| patient | `/ai/skin-analysis` | `patient/nabd plus/app/ai/skin-analysis.tsx` | ديناميكي | 15 | استدعاء API ديناميكي يحتاج تتبعاً يدوياً<br>تفاعلات دون عقد API حرفي في الملف |
| patient | `/ai/symptom-checker` | `patient/nabd plus/app/ai/symptom-checker.tsx` | ديناميكي | 42 | استدعاء API ديناميكي يحتاج تتبعاً يدوياً<br>تفاعلات دون عقد API حرفي في الملف |
| patient | `/ai/symptom-timeline` | `patient/nabd plus/app/ai/symptom-timeline.tsx` | — | 3 | تفاعلات دون عقد API حرفي في الملف |
| patient | `/ai/triage` | `patient/nabd plus/app/ai/triage.tsx` | ديناميكي | 12 | مؤشر بيانات بديلة/محاكاة يحتاج مراجعة<br>استدعاء API ديناميكي يحتاج تتبعاً يدوياً<br>تفاعلات دون عقد API حرفي في الملف |
| patient | `/ai-assistant` | `patient/nabd plus/app/ai-assistant.tsx` | `/ai/triage-chat` | 3 | مؤشر بيانات بديلة/محاكاة يحتاج مراجعة |
| patient | `/community/hub` | `patient/nabd plus/app/community/hub.tsx` | `/community/posts?page=1&limit=20` | 8 | — |
| patient | `/community/live-session` | `patient/nabd plus/app/community/live-session.tsx` | — | 11 | مؤشر بيانات بديلة/محاكاة يحتاج مراجعة<br>تفاعلات دون عقد API حرفي في الملف |
| patient | `/community/post-detail` | `patient/nabd plus/app/community/post-detail.tsx` | `/community/posts/${postId}`<br>`/community/posts/${postId}/vote`<br>`/community/posts/${postId}/comment` | 13 | مؤشر بيانات بديلة/محاكاة يحتاج مراجعة |
| patient | `/consultations/appointment-detail` | `patient/nabd plus/app/consultations/appointment-detail.tsx` | `/patient/pay-copay` | 21 | — |
| patient | `/consultations/appointments` | `patient/nabd plus/app/consultations/appointments.tsx` | — | 28 | تفاعلات دون عقد API حرفي في الملف |
| patient | `/consultations/booking-confirm` | `patient/nabd plus/app/consultations/booking-confirm.tsx` | `${baseUrl}/insurance/coverage-check?provider_id=${params.doctorId ||` | 12 | — |
| patient | `/consultations/booking-success` | `patient/nabd plus/app/consultations/booking-success.tsx` | — | 12 | تفاعلات دون عقد API حرفي في الملف |
| patient | `/consultations/call-history` | `patient/nabd plus/app/consultations/call-history.tsx` | `/calls/history?page=${pageNum}&limit=20` | 6 | — |
| patient | `/consultations/cancel-reschedule` | `patient/nabd plus/app/consultations/cancel-reschedule.tsx` | — | 24 | تفاعلات دون عقد API حرفي في الملف |
| patient | `/consultations/chat-with-doctor` | `patient/nabd plus/app/consultations/chat-with-doctor.tsx` | `/care/doctors/${doctorId}`<br>`/chat/history/${doctorId}`<br>`/chat/send` | 12 | مؤشر بيانات بديلة/محاكاة يحتاج مراجعة |
| patient | `/consultations/clinic/[id]` | `patient/nabd plus/app/consultations/clinic/[id].tsx` | ديناميكي | 5 | استدعاء API ديناميكي يحتاج تتبعاً يدوياً<br>تفاعلات دون عقد API حرفي في الملف |
| patient | `/consultations/clinic-location` | `patient/nabd plus/app/consultations/clinic-location.tsx` | `/care/appointments/${appointmentId}` | 5 | — |
| patient | `/consultations/doctor/[id]` | `patient/nabd plus/app/consultations/doctor/[id].tsx` | `/care/doctors/${encodeURIComponent(id ||` | 30 | — |
| patient | `/consultations/doctor-profile` | `patient/nabd plus/app/consultations/doctor-profile.tsx` | `/care/appointments/waitlist/join` | 39 | — |
| patient | `/consultations/doctor-search` | `patient/nabd plus/app/consultations/doctor-search.tsx` | `/care/doctors?${qs.toString()}` | 6 | مؤشر بيانات بديلة/محاكاة يحتاج مراجعة |
| patient | `/consultations/follow-up` | `patient/nabd plus/app/consultations/follow-up.tsx` | `/consultations/${consultationId}`<br>`/consultations/${consultationId}/messages` | 7 | مؤشر بيانات بديلة/محاكاة يحتاج مراجعة |
| patient | `/consultations/home-visit-tracking` | `patient/nabd plus/app/consultations/home-visit-tracking.tsx` | `/care/appointments/${appointmentId}` | 7 | — |
| patient | `/consultations/incoming-call` | `patient/nabd plus/app/consultations/incoming-call.tsx` | `/calls/${sessionId}/reject` | 6 | — |
| patient | `/consultations/offer/[id]` | `patient/nabd plus/app/consultations/offer/[id].tsx` | `/promotions/offers/${id}/providers` | 16 | مؤشر بيانات بديلة/محاكاة يحتاج مراجعة |
| patient | `/consultations/post-call-rating` | `patient/nabd plus/app/consultations/post-call-rating.tsx` | `/care/appointments/rating` | 12 | مؤشر بيانات بديلة/محاكاة يحتاج مراجعة |
| patient | `/consultations/prescription-from-doctor` | `patient/nabd plus/app/consultations/prescription-from-doctor.tsx` | `/prescriptions/active` | 13 | — |
| patient | `/consultations/share-report` | `patient/nabd plus/app/consultations/share-report.tsx` | — | 5 | تفاعلات دون عقد API حرفي في الملف |
| patient | `/consultations/specialty-select` | `patient/nabd plus/app/consultations/specialty-select.tsx` | `/care/specialties` | 4 | مؤشر بيانات بديلة/محاكاة يحتاج مراجعة |
| patient | `/consultations/video/[id]` | `patient/nabd plus/app/consultations/video/[id].tsx` | — | 0 | — |
| patient | `/consultations/video-call` | `patient/nabd plus/app/consultations/video-call.tsx` | `/care/appointments/${appointmentId}/video-token` | 8 | مؤشر بيانات بديلة/محاكاة يحتاج مراجعة |
| patient | `/consultations/virtual-waiting-room` | `patient/nabd plus/app/consultations/virtual-waiting-room.tsx` | `/care/appointments/${appointmentId}` | 7 | — |
| patient | `/consultations/waiting-room` | `patient/nabd plus/app/consultations/waiting-room.tsx` | `/care/appointments/${appointmentId}` | 7 | — |
| patient | `/delivery/address-select` | `patient/nabd plus/app/delivery/address-select.tsx` | `/users/me/addresses` | 12 | مؤشر بيانات بديلة/محاكاة يحتاج مراجعة |
| patient | `/diagnostics/book-sample` | `patient/nabd plus/app/diagnostics/book-sample.tsx` | — | 8 | تفاعلات دون عقد API حرفي في الملف |
| patient | `/diagnostics/booking-confirm` | `patient/nabd plus/app/diagnostics/booking-confirm.tsx` | `/cart/clear` | 8 | مؤشر بيانات بديلة/محاكاة يحتاج مراجعة |
| patient | `/diagnostics/booking-success` | `patient/nabd plus/app/diagnostics/booking-success.tsx` | — | 7 | تفاعلات دون عقد API حرفي في الملف |
| patient | `/diagnostics/cart` | `patient/nabd plus/app/diagnostics/cart.tsx` | `/labs/compatible-providers?testIds=${ids}` | 24 | — |
| patient | `/diagnostics/checkout` | `patient/nabd plus/app/diagnostics/checkout.tsx` | ديناميكي | 20 | مؤشر بيانات بديلة/محاكاة يحتاج مراجعة<br>استدعاء API ديناميكي يحتاج تتبعاً يدوياً<br>تفاعلات دون عقد API حرفي في الملف |
| patient | `/diagnostics/insurance-approval` | `patient/nabd plus/app/diagnostics/insurance-approval.tsx` | `/orders/${orderId}`<br>`/orders/${orderId}/items/${item.id}/opt-in-cash` | 17 | — |
| patient | `/diagnostics/insurance-upload` | `patient/nabd plus/app/diagnostics/insurance-upload.tsx` | `/providers?type=lab`<br>`/orders/create` | 35 | مؤشر بيانات بديلة/محاكاة يحتاج مراجعة |
| patient | `/diagnostics/lab/[id]` | `patient/nabd plus/app/diagnostics/lab/[id].tsx` | `/providers/${id}`<br>`/labs/services?providerId=${id}` | 13 | مؤشر بيانات بديلة/محاكاة يحتاج مراجعة |
| patient | `/diagnostics/lab-comparison` | `patient/nabd plus/app/diagnostics/lab-comparison.tsx` | `/labs/services/${id}`<br>`/labs/compatible-providers?testIds=${id}` | 10 | — |
| patient | `/diagnostics/my-results` | `patient/nabd plus/app/diagnostics/my-results.tsx` | ديناميكي | 4 | استدعاء API ديناميكي يحتاج تتبعاً يدوياً<br>تفاعلات دون عقد API حرفي في الملف |
| patient | `/diagnostics/order/[id]` | `patient/nabd plus/app/diagnostics/order/[id].tsx` | `/orders/mine` | 13 | مؤشر بيانات بديلة/محاكاة يحتاج مراجعة |
| patient | `/diagnostics/orders` | `patient/nabd plus/app/diagnostics/orders.tsx` | `/labs/bookings/mine` | 13 | — |
| patient | `/diagnostics/package-detail` | `patient/nabd plus/app/diagnostics/package-detail.tsx` | `/labs/packages/${id}` | 7 | — |
| patient | `/diagnostics/packages` | `patient/nabd plus/app/diagnostics/packages.tsx` | `/labs/packages`<br>`/labs/categories` | 10 | مؤشر بيانات بديلة/محاكاة يحتاج مراجعة |
| patient | `/diagnostics/results-history` | `patient/nabd plus/app/diagnostics/results-history.tsx` | ديناميكي | 5 | استدعاء API ديناميكي يحتاج تتبعاً يدوياً<br>تفاعلات دون عقد API حرفي في الملف |
| patient | `/diagnostics/sample-tracking` | `patient/nabd plus/app/diagnostics/sample-tracking.tsx` | ديناميكي | 6 | استدعاء API ديناميكي يحتاج تتبعاً يدوياً<br>تفاعلات دون عقد API حرفي في الملف |
| patient | `/diagnostics/search` | `patient/nabd plus/app/diagnostics/search.tsx` | `/labs/services` | 3 | مؤشر بيانات بديلة/محاكاة يحتاج مراجعة |
| patient | `/diagnostics/technician-tracking` | `patient/nabd plus/app/diagnostics/technician-tracking.tsx` | `/labs/bookings/${bookingId}` | 3 | — |
| patient | `/diagnostics/test-detail` | `patient/nabd plus/app/diagnostics/test-detail.tsx` | ديناميكي | 8 | استدعاء API ديناميكي يحتاج تتبعاً يدوياً<br>تفاعلات دون عقد API حرفي في الملف |
| patient | `/diagnostics/upload-rx` | `patient/nabd plus/app/diagnostics/upload-rx.tsx` | — | 0 | — |
| patient | `/drug-scanner` | `patient/nabd plus/app/drug-scanner/index.tsx` | `/health/medications`<br>`/ai/drug-interactions` | 13 | — |
| patient | `/emergency` | `patient/nabd plus/app/emergency/index.tsx` | — | 0 | — |
| patient | `/emergency/sos-active` | `patient/nabd plus/app/emergency/sos-active.tsx` | `/emergency/sos/status` | 7 | — |
| patient | `/emergency/sos` | `patient/nabd plus/app/emergency/sos.tsx` | ديناميكي | 14 | استدعاء API ديناميكي يحتاج تتبعاً يدوياً<br>تفاعلات دون عقد API حرفي في الملف |
| patient | `/emergency/tracking` | `patient/nabd plus/app/emergency/tracking.tsx` | `/emergency/tracking` | 5 | مؤشر بيانات بديلة/محاكاة يحتاج مراجعة |
| patient | `/family/calendar` | `patient/nabd plus/app/family/calendar.tsx` | `/family/calendar`<br>`/family/calendar/event`<br>`/family/calendar/event/${id}` | 9 | — |
| patient | `/family/chat` | `patient/nabd plus/app/family/chat.tsx` | `/family/chat/messages` | 13 | مؤشر بيانات بديلة/محاكاة يحتاج مراجعة |
| patient | `/family/emergency-contacts` | `patient/nabd plus/app/family/emergency-contacts.tsx` | — | 5 | تفاعلات دون عقد API حرفي في الملف |
| patient | `/family/hub` | `patient/nabd plus/app/family/hub.tsx` | `/family/members` | 12 | — |
| patient | `/family` | `patient/nabd plus/app/family/index.tsx` | — | 0 | — |
| patient | `/family/invite` | `patient/nabd plus/app/family/invite.tsx` | `/family/invite` | 7 | مؤشر بيانات بديلة/محاكاة يحتاج مراجعة |
| patient | `/family/join` | `patient/nabd plus/app/family/join.tsx` | `/family/join` | 6 | مؤشر بيانات بديلة/محاكاة يحتاج مراجعة |
| patient | `/family/member-health` | `patient/nabd plus/app/family/member-health.tsx` | `/family/member-health/${memberId}` | 6 | — |
| patient | `/family/permission-request` | `patient/nabd plus/app/family/permission-request.tsx` | `/family/permissions/pending`<br>`/family/permissions/respond/${requestInfo._id || requestInfo.id}` | 4 | مؤشر بيانات بديلة/محاكاة يحتاج مراجعة |
| patient | `/family/permissions` | `patient/nabd plus/app/family/permissions.tsx` | `/family/permissions/request`<br>`/family/remove-member/${memberId}` | 4 | — |
| patient | `/family/shared-calendar` | `patient/nabd plus/app/family/shared-calendar.tsx` | `/family/calendar`<br>`/family/calendar/event`<br>`/family/calendar/event/${id}` | 9 | مؤشر بيانات بديلة/محاكاة يحتاج مراجعة |
| patient | `/family/voice-call` | `patient/nabd plus/app/family/voice-call.tsx` | — | 10 | تفاعلات دون عقد API حرفي في الملف |
| patient | `/health/actionable-order` | `patient/nabd plus/app/health/actionable-order.tsx` | — | 11 | تفاعلات دون عقد API حرفي في الملف |
| patient | `/health/add-family-member` | `patient/nabd plus/app/health/add-family-member.tsx` | — | 0 | — |
| patient | `/health/chronic-disease` | `patient/nabd plus/app/health/chronic-disease.tsx` | `/health/chronic-diseases`<br>`/health/vitals` | 8 | — |
| patient | `/health/chronic-medications` | `patient/nabd plus/app/health/chronic-medications.tsx` | `/health/chronic-meds` | 6 | — |
| patient | `/health/conditions-allergies` | `patient/nabd plus/app/health/conditions-allergies.tsx` | — | 15 | مؤشر بيانات بديلة/محاكاة يحتاج مراجعة<br>تفاعلات دون عقد API حرفي في الملف |
| patient | `/health/edit-profile` | `patient/nabd plus/app/health/edit-profile.tsx` | `/users/me/profile` | 21 | مؤشر بيانات بديلة/محاكاة يحتاج مراجعة |
| patient | `/health/emergency-contacts` | `patient/nabd plus/app/health/emergency-contacts.tsx` | `/health/emergency-contacts` | 8 | — |
| patient | `/health/family-calendar` | `patient/nabd plus/app/health/family-calendar.tsx` | — | 0 | — |
| patient | `/health/family-chat` | `patient/nabd plus/app/health/family-chat.tsx` | — | 0 | — |
| patient | `/health/family-hub` | `patient/nabd plus/app/health/family-hub.tsx` | `/family/my-group`<br>`/family/members`<br>`/family/create` | 13 | — |
| patient | `/health/family-member-detail` | `patient/nabd plus/app/health/family-member-detail.tsx` | — | 0 | — |
| patient | `/health/health-id` | `patient/nabd plus/app/health/health-id.tsx` | — | 10 | مؤشر بيانات بديلة/محاكاة يحتاج مراجعة<br>تفاعلات دون عقد API حرفي في الملف |
| patient | `/health/medication-reminder-add` | `patient/nabd plus/app/health/medication-reminder-add.tsx` | — | 17 | مؤشر بيانات بديلة/محاكاة يحتاج مراجعة<br>تفاعلات دون عقد API حرفي في الملف |
| patient | `/health/medication-reminder-list` | `patient/nabd plus/app/health/medication-reminder-list.tsx` | `/health/medications/reminders` | 9 | — |
| patient | `/health/medications` | `patient/nabd plus/app/health/medications.tsx` | — | 2 | تفاعلات دون عقد API حرفي في الملف |
| patient | `/health/prescriptions` | `patient/nabd plus/app/health/prescriptions.tsx` | `/health/prescriptions` | 8 | — |
| patient | `/health/refills` | `patient/nabd plus/app/health/refills.tsx` | `/medical-profile` | 5 | مؤشر بيانات بديلة/محاكاة يحتاج مراجعة |
| patient | `/health/reminders` | `patient/nabd plus/app/health/reminders.tsx` | `/health/reminders`<br>`/health/reminders/${id}/log` | 7 | — |
| patient | `/health/reports` | `patient/nabd plus/app/health/reports.tsx` | `/health/reports` | 6 | — |
| patient | `/health/sleep-score` | `patient/nabd plus/app/health/sleep-score.tsx` | — | 2 | تفاعلات دون عقد API حرفي في الملف |
| patient | `/health/sleep-tracker` | `patient/nabd plus/app/health/sleep-tracker.tsx` | — | 2 | تفاعلات دون عقد API حرفي في الملف |
| patient | `/health/smart-reminders` | `patient/nabd plus/app/health/smart-reminders.tsx` | — | 9 | تفاعلات دون عقد API حرفي في الملف |
| patient | `/health/trends` | `patient/nabd plus/app/health/trends.tsx` | `/health/trends` | 13 | — |
| patient | `/health/vitals-log` | `patient/nabd plus/app/health/vitals-log.tsx` | `/health/vitals/chart?vital=${vital}`<br>`/health/vitals/recent?vital=${vital}`<br>`/health/vitals` | 8 | مؤشر بيانات بديلة/محاكاة يحتاج مراجعة |
| patient | `/health/vitals` | `patient/nabd plus/app/health/vitals.tsx` | `/health/vitals/summary` | 5 | — |
| patient | `/health/wearables` | `patient/nabd plus/app/health/wearables.tsx` | `/health/wearables/devices`<br>`/health/wearables/data` | 7 | — |
| patient | `/index` | `patient/nabd plus/app/index.tsx` | — | 3 | تفاعلات دون عقد API حرفي في الملف |
| patient | `/insurance/add-policy` | `patient/nabd plus/app/insurance/add-policy.tsx` | `/insurance/companies`<br>`/insurance/ocr-extract`<br>`/insurance/save-policy` | 11 | مؤشر بيانات بديلة/محاكاة يحتاج مراجعة |
| patient | `/insurance/approval-pending` | `patient/nabd plus/app/insurance/approval-pending.tsx` | — | 4 | تفاعلات دون عقد API حرفي في الملف |
| patient | `/insurance/benefits-summary` | `patient/nabd plus/app/insurance/benefits-summary.tsx` | `/insurance/benefits-summary` | 3 | — |
| patient | `/insurance/claim-tracking` | `patient/nabd plus/app/insurance/claim-tracking.tsx` | `/api/v1/insurance/claims/my` | 8 | — |
| patient | `/insurance/copay` | `patient/nabd plus/app/insurance/copay.tsx` | `/provider/jobs/insurance-copay` | 5 | — |
| patient | `/insurance/coverage-check` | `patient/nabd plus/app/insurance/coverage-check.tsx` | `/insurance/coverage-check?service_type=${serviceType}${providerName ?` | 14 | مؤشر بيانات بديلة/محاكاة يحتاج مراجعة |
| patient | `/insurance/hub` | `patient/nabd plus/app/insurance/hub.tsx` | `/users/me/insurance`<br>`/insurance/claims`<br>`/insurance/save-policy` | 25 | — |
| patient | `/insurance` | `patient/nabd plus/app/insurance/index.tsx` | — | 0 | — |
| patient | `/insurance/network-providers` | `patient/nabd plus/app/insurance/network-providers.tsx` | — | 12 | مؤشر بيانات بديلة/محاكاة يحتاج مراجعة<br>تفاعلات دون عقد API حرفي في الملف |
| patient | `/insurance/payment-split` | `patient/nabd plus/app/insurance/payment-split.tsx` | `/insurance/coverage-check?service_type=${SERVICE.serviceType}`<br>`/insurance/payment-confirm` | 18 | — |
| patient | `/insurance/policy-detail` | `patient/nabd plus/app/insurance/policy-detail.tsx` | — | 6 | تفاعلات دون عقد API حرفي في الملف |
| patient | `/insurance/refund-status` | `patient/nabd plus/app/insurance/refund-status.tsx` | — | 3 | تفاعلات دون عقد API حرفي في الملف |
| patient | `/insurance/submit-claim` | `patient/nabd plus/app/insurance/submit-claim.tsx` | `/insurance/claims/submit` | 5 | — |
| patient | `/loyalty/challenges` | `patient/nabd plus/app/loyalty/challenges.tsx` | `/loyalty/challenges` | 5 | — |
| patient | `/loyalty/hub` | `patient/nabd plus/app/loyalty/hub.tsx` | `/loyalty/account`<br>`/loyalty/transactions?page=1`<br>`/loyalty/config`<br>`/loyalty/rewards` | 11 | — |
| patient | `/loyalty/leaderboard` | `patient/nabd plus/app/loyalty/leaderboard.tsx` | — | 2 | تفاعلات دون عقد API حرفي في الملف |
| patient | `/loyalty/referrals` | `patient/nabd plus/app/loyalty/referrals.tsx` | — | 4 | تفاعلات دون عقد API حرفي في الملف |
| patient | `/loyalty/rewards` | `patient/nabd plus/app/loyalty/rewards.tsx` | `/loyalty/account`<br>`/loyalty/rewards`<br>`/loyalty/rewards/${reward.id}/claim` | 6 | — |
| patient | `/map` | `patient/nabd plus/app/map/index.tsx` | `/providers/map?${query.toString()}`<br>`/user/insurance` | 36 | مؤشر بيانات بديلة/محاكاة يحتاج مراجعة |
| patient | `/maternity/baby-development` | `patient/nabd plus/app/maternity/baby-development.tsx` | `/maternity/profile` | 10 | — |
| patient | `/maternity/baby-growth` | `patient/nabd plus/app/maternity/baby-growth.tsx` | `/maternity/infant-growth`<br>`/maternity/profile`<br>`/maternity/vaccines` | 16 | مؤشر بيانات بديلة/محاكاة يحتاج مراجعة |
| patient | `/maternity/fetus-data` | `patient/nabd plus/app/maternity/fetus-data.ts` | — | 0 | — |
| patient | `/maternity/hub` | `patient/nabd plus/app/maternity/hub.tsx` | `/maternity/content`<br>`/maternity/profile`<br>`/maternity/checkups/${encodeURIComponent(week)}/toggle` | 30 | مؤشر بيانات بديلة/محاكاة يحتاج مراجعة |
| patient | `/maternity/maternity-setup` | `patient/nabd plus/app/maternity/maternity-setup.tsx` | `/maternity/profile` | 32 | مؤشر بيانات بديلة/محاكاة يحتاج مراجعة |
| patient | `/maternity/ovulation-tracker` | `patient/nabd plus/app/maternity/ovulation-tracker.tsx` | `/maternity/profile` | 27 | — |
| patient | `/maternity/pregnancy-tracker` | `patient/nabd plus/app/maternity/pregnancy-tracker.tsx` | `/maternity/profile`<br>`/maternity/kicks`<br>`/maternity/contractions`<br>`/maternity/checkups/${encodeURIComponent(week)}/toggle` | 12 | مؤشر بيانات بديلة/محاكاة يحتاج مراجعة |
| patient | `/mental-health/breathing` | `patient/nabd plus/app/mental-health/breathing.tsx` | `/mental-health/breathing` | 9 | — |
| patient | `/mental-health/crisis-support` | `patient/nabd plus/app/mental-health/crisis-support.tsx` | `/mental-health/crisis-contacts`<br>`/mental-health/hotlines` | 15 | — |
| patient | `/mental-health/hub` | `patient/nabd plus/app/mental-health/hub.tsx` | — | 2 | تفاعلات دون عقد API حرفي في الملف |
| patient | `/mental-health` | `patient/nabd plus/app/mental-health/index.tsx` | — | 0 | — |
| patient | `/mental-health/meditation` | `patient/nabd plus/app/mental-health/meditation.tsx` | `/mental-health/meditation/sessions`<br>`/mental-health/meditation` | 13 | — |
| patient | `/mental-health/mood-journal` | `patient/nabd plus/app/mental-health/mood-journal.tsx` | `/mental-health/mood?days=7`<br>`/mental-health/mood` | 11 | مؤشر بيانات بديلة/محاكاة يحتاج مراجعة |
| patient | `/mental-health/self-assessment` | `patient/nabd plus/app/mental-health/self-assessment.tsx` | `/mental-health/assessment-questions`<br>`/mental-health/assessment` | 14 | — |
| patient | `/mental-health/therapist-match` | `patient/nabd plus/app/mental-health/therapist-match.tsx` | ديناميكي | 7 | استدعاء API ديناميكي يحتاج تتبعاً يدوياً<br>تفاعلات دون عقد API حرفي في الملف |
| patient | `/notifications` | `patient/nabd plus/app/notifications/index.tsx` | — | 10 | تفاعلات دون عقد API حرفي في الملف |
| patient | `/nursing/live-doctor-tracking` | `patient/nabd plus/app/nursing/live-doctor-tracking.tsx` | — | 5 | مؤشر بيانات بديلة/محاكاة يحتاج مراجعة<br>تفاعلات دون عقد API حرفي في الملف |
| patient | `/nursing/live-tracking` | `patient/nabd plus/app/nursing/live-tracking.tsx` | `/nursing/visits/${bookingId}/tracking` | 12 | — |
| patient | `/nursing/nurse-profile` | `patient/nabd plus/app/nursing/nurse-profile.tsx` | `/home-care/providers/${nurseId}`<br>`/home-care/insurance/verify`<br>`/home-care/bookings` | 29 | — |
| patient | `/nursing/service-details` | `patient/nabd plus/app/nursing/service-details.tsx` | `/home-care/providers?type=${serviceId}&sort=${sortType}&gender=${gender ||` | 28 | — |
| patient | `/nutrition/ai-meal-planner` | `patient/nabd plus/app/nutrition/ai-meal-planner.tsx` | ديناميكي | 19 | استدعاء API ديناميكي يحتاج تتبعاً يدوياً<br>تفاعلات دون عقد API حرفي في الملف |
| patient | `/nutrition/ai-plan-builder` | `patient/nabd plus/app/nutrition/ai-plan-builder.tsx` | `/nutrition/profile` | 9 | مؤشر بيانات بديلة/محاكاة يحتاج مراجعة |
| patient | `/nutrition/body-composition` | `patient/nabd plus/app/nutrition/body-composition.tsx` | `/nutrition/profile` | 3 | مؤشر بيانات بديلة/محاكاة يحتاج مراجعة |
| patient | `/nutrition/body-target` | `patient/nabd plus/app/nutrition/body-target.tsx` | `/nutrition/profile` | 4 | مؤشر بيانات بديلة/محاكاة يحتاج مراجعة |
| patient | `/nutrition/calorie-analyzer` | `patient/nabd plus/app/nutrition/calorie-analyzer.tsx` | `/nutrition/meals` | 7 | مؤشر بيانات بديلة/محاكاة يحتاج مراجعة |
| patient | `/nutrition/daily-tracker` | `patient/nabd plus/app/nutrition/daily-tracker.tsx` | `/nutrition/water` | 9 | مؤشر بيانات بديلة/محاكاة يحتاج مراجعة |
| patient | `/nutrition/exercise-plan` | `patient/nabd plus/app/nutrition/exercise-plan.tsx` | — | 3 | تفاعلات دون عقد API حرفي في الملف |
| patient | `/nutrition/food-scanner` | `patient/nabd plus/app/nutrition/food-scanner.tsx` | `/nutrition/meals` | 15 | مؤشر بيانات بديلة/محاكاة يحتاج مراجعة |
| patient | `/nutrition/hub` | `patient/nabd plus/app/nutrition/hub.tsx` | — | 2 | تفاعلات دون عقد API حرفي في الملف |
| patient | `/nutrition` | `patient/nabd plus/app/nutrition/index.tsx` | — | 0 | — |
| patient | `/nutrition/log-meal` | `patient/nabd plus/app/nutrition/log-meal.tsx` | `/nutrition/foods`<br>`/nutrition/meals` | 16 | مؤشر بيانات بديلة/محاكاة يحتاج مراجعة |
| patient | `/nutrition/nutrition-plan` | `patient/nabd plus/app/nutrition/nutrition-plan.tsx` | — | 0 | — |
| patient | `/nutrition/water-tracker` | `patient/nabd plus/app/nutrition/water-tracker.tsx` | `/nutrition/water` | 5 | — |
| patient | `/offers/[id]` | `patient/nabd plus/app/offers/[id].tsx` | ديناميكي | 11 | استدعاء API ديناميكي يحتاج تتبعاً يدوياً<br>تفاعلات دون عقد API حرفي في الملف |
| patient | `/payments/failed` | `patient/nabd plus/app/payments/failed.tsx` | — | 9 | تفاعلات دون عقد API حرفي في الملف |
| patient | `/payments/failure` | `patient/nabd plus/app/payments/failure.tsx` | — | 3 | تفاعلات دون عقد API حرفي في الملف |
| patient | `/payments/processing` | `patient/nabd plus/app/payments/processing.tsx` | ديناميكي | 5 | مؤشر بيانات بديلة/محاكاة يحتاج مراجعة<br>استدعاء API ديناميكي يحتاج تتبعاً يدوياً<br>تفاعلات دون عقد API حرفي في الملف |
| patient | `/payments/success` | `patient/nabd plus/app/payments/success.tsx` | — | 10 | تفاعلات دون عقد API حرفي في الملف |
| patient | `/pharmacy/barcode-scanner` | `patient/nabd plus/app/pharmacy/barcode-scanner.tsx` | — | 8 | مؤشر بيانات بديلة/محاكاة يحتاج مراجعة<br>تفاعلات دون عقد API حرفي في الملف |
| patient | `/pharmacy/broadcast-status` | `patient/nabd plus/app/pharmacy/broadcast-status.tsx` | `/orders/bids/request/${requestId ||`<br>`/orders/bids/${pharmacyId}/accept` | 10 | — |
| patient | `/pharmacy/cart` | `patient/nabd plus/app/pharmacy/cart.tsx` | — | 31 | تفاعلات دون عقد API حرفي في الملف |
| patient | `/pharmacy/chat-with-pharmacist` | `patient/nabd plus/app/pharmacy/chat-with-pharmacist.tsx` | `/chat/history?orderId=${orderId ||` | 24 | مؤشر بيانات بديلة/محاكاة يحتاج مراجعة |
| patient | `/pharmacy/checkout` | `patient/nabd plus/app/pharmacy/checkout.tsx` | `/users/me/profile`<br>`/api/v1/pharmacy/orders` | 18 | مؤشر بيانات بديلة/محاكاة يحتاج مراجعة |
| patient | `/pharmacy/custom-item` | `patient/nabd plus/app/pharmacy/custom-item.tsx` | — | 12 | مؤشر بيانات بديلة/محاكاة يحتاج مراجعة<br>تفاعلات دون عقد API حرفي في الملف |
| patient | `/pharmacy/drug-not-found` | `patient/nabd plus/app/pharmacy/drug-not-found.tsx` | `/patient/pharmacy/shortage-flags/lookup?generic_name=${encodeURIComponent(name)}` | 10 | مؤشر بيانات بديلة/محاكاة يحتاج مراجعة |
| patient | `/pharmacy/filters` | `patient/nabd plus/app/pharmacy/filters.tsx` | `/medicines/filters` | 24 | مؤشر بيانات بديلة/محاكاة يحتاج مراجعة |
| patient | `/pharmacy/manual-order` | `patient/nabd plus/app/pharmacy/manual-order.tsx` | — | 11 | مؤشر بيانات بديلة/محاكاة يحتاج مراجعة<br>تفاعلات دون عقد API حرفي في الملف |
| patient | `/pharmacy/medicine-compare` | `patient/nabd plus/app/pharmacy/medicine-compare.tsx` | `/medicines/compare` | 6 | مؤشر بيانات بديلة/محاكاة يحتاج مراجعة |
| patient | `/pharmacy/order-confirm` | `patient/nabd plus/app/pharmacy/order-confirm.tsx` | `/orders/${orderId}`<br>`/orders/${orderId}/approve-basket`<br>`/orders/${orderId}/reject-basket` | 9 | مؤشر بيانات بديلة/محاكاة يحتاج مراجعة |
| patient | `/pharmacy/order-history` | `patient/nabd plus/app/pharmacy/order-history.tsx` | `/orders/mine` | 14 | — |
| patient | `/pharmacy/order-tracking` | `patient/nabd plus/app/pharmacy/order-tracking.tsx` | `/orders/${orderIdStr}/tracking` | 9 | مؤشر بيانات بديلة/محاكاة يحتاج مراجعة |
| patient | `/pharmacy/payment` | `patient/nabd plus/app/pharmacy/payment.tsx` | `/payments/paymob/methods`<br>`/payments/paymob/initiate` | 11 | مؤشر بيانات بديلة/محاكاة يحتاج مراجعة |
| patient | `/pharmacy/pharmacist-chat` | `patient/nabd plus/app/pharmacy/pharmacist-chat.tsx` | ديناميكي | 11 | مؤشر بيانات بديلة/محاكاة يحتاج مراجعة<br>استدعاء API ديناميكي يحتاج تتبعاً يدوياً<br>تفاعلات دون عقد API حرفي في الملف |
| patient | `/pharmacy/product-detail` | `patient/nabd plus/app/pharmacy/product-detail.tsx` | `/medicines/${id}`<br>`/medicines/${id}/alternatives` | 20 | — |
| patient | `/pharmacy/product-search` | `patient/nabd plus/app/pharmacy/product-search.tsx` | — | 0 | — |
| patient | `/pharmacy/reorder` | `patient/nabd plus/app/pharmacy/reorder.tsx` | `/orders/${orderId}`<br>`/orders/${orderId}/reorder`<br>`/orders/${orderId}/reorder-partial` | 13 | مؤشر بيانات بديلة/محاكاة يحتاج مراجعة |
| patient | `/pharmacy/rx-order` | `patient/nabd plus/app/pharmacy/rx-order.tsx` | `/cart/prescription` | 15 | — |
| patient | `/pharmacy/scan-prescription` | `patient/nabd plus/app/pharmacy/scan-prescription.tsx` | `/ai/prescription-ocr` | 11 | — |
| patient | `/pharmacy/waiting-for-pharmacy` | `patient/nabd plus/app/pharmacy/waiting-for-pharmacy.tsx` | `/orders/${orderId}`<br>`/orders/${orderId}/cancel` | 7 | مؤشر بيانات بديلة/محاكاة يحتاج مراجعة |
| patient | `/pharmacy/wishlist` | `patient/nabd plus/app/pharmacy/wishlist.tsx` | `/users/me/wishlist`<br>`/users/me/wishlist/${id}` | 15 | — |
| patient | `/profile/addresses` | `patient/nabd plus/app/profile/addresses.tsx` | `/users/me/addresses`<br>`/users/me/addresses/${id}` | 5 | — |
| patient | `/profile/edit` | `patient/nabd plus/app/profile/edit.tsx` | — | 0 | — |
| patient | `/profile` | `patient/nabd plus/app/profile/index.tsx` | — | 11 | تفاعلات دون عقد API حرفي في الملف |
| patient | `/profile/insurance` | `patient/nabd plus/app/profile/insurance.tsx` | `/users/me/insurance` | 3 | — |
| patient | `/programs/active` | `patient/nabd plus/app/programs/active.tsx` | `/medical/programs/active`<br>`/medical/programs/complete-session` | 9 | — |
| patient | `/reports/ai-analysis` | `patient/nabd plus/app/reports/ai-analysis.tsx` | — | 3 | تفاعلات دون عقد API حرفي في الملف |
| patient | `/reports/hub` | `patient/nabd plus/app/reports/hub.tsx` | — | 11 | تفاعلات دون عقد API حرفي في الملف |
| patient | `/reports/passport` | `patient/nabd plus/app/reports/passport.tsx` | `/medical-profile` | 6 | — |
| patient | `/reports/timeline` | `patient/nabd plus/app/reports/timeline.tsx` | `/reports/timeline` | 7 | — |
| patient | `/reports/view-report` | `patient/nabd plus/app/reports/view-report.tsx` | `/reports/${params.id}` | 9 | مؤشر بيانات بديلة/محاكاة يحتاج مراجعة |
| patient | `/returns/detail` | `patient/nabd plus/app/returns/detail.tsx` | ديناميكي | 3 | استدعاء API ديناميكي يحتاج تتبعاً يدوياً<br>تفاعلات دون عقد API حرفي في الملف |
| patient | `/returns/hub` | `patient/nabd plus/app/returns/hub.tsx` | ديناميكي | 16 | استدعاء API ديناميكي يحتاج تتبعاً يدوياً<br>تفاعلات دون عقد API حرفي في الملف |
| patient | `/returns/new-request` | `patient/nabd plus/app/returns/new-request.tsx` | `/pharmacy/returns` | 20 | مؤشر بيانات بديلة/محاكاة يحتاج مراجعة |
| patient | `/reviews` | `patient/nabd plus/app/reviews/index.tsx` | — | 15 | مؤشر بيانات بديلة/محاكاة يحتاج مراجعة<br>تفاعلات دون عقد API حرفي في الملف |
| patient | `/room/[id]` | `patient/nabd plus/app/room/[id].tsx` | `/calls/${id}/join` | 12 | — |
| patient | `/search` | `patient/nabd plus/app/search/index.tsx` | `/home/search?q=${encodeURIComponent(query)}` | 13 | مؤشر بيانات بديلة/محاكاة يحتاج مراجعة |
| patient | `/settings/about` | `patient/nabd plus/app/settings/about.tsx` | — | 11 | تفاعلات دون عقد API حرفي في الملف |
| patient | `/settings/data` | `patient/nabd plus/app/settings/data.tsx` | ديناميكي | 7 | استدعاء API ديناميكي يحتاج تتبعاً يدوياً<br>تفاعلات دون عقد API حرفي في الملف |
| patient | `/settings/feedback` | `patient/nabd plus/app/settings/feedback.tsx` | `/support/feedback` | 14 | مؤشر بيانات بديلة/محاكاة يحتاج مراجعة |
| patient | `/settings/help` | `patient/nabd plus/app/settings/help.tsx` | ديناميكي | 14 | استدعاء API ديناميكي يحتاج تتبعاً يدوياً<br>تفاعلات دون عقد API حرفي في الملف |
| patient | `/settings` | `patient/nabd plus/app/settings/index.tsx` | — | 8 | تفاعلات دون عقد API حرفي في الملف |
| patient | `/settings/language` | `patient/nabd plus/app/settings/language.tsx` | — | 6 | تفاعلات دون عقد API حرفي في الملف |
| patient | `/settings/notifications-settings` | `patient/nabd plus/app/settings/notifications-settings.tsx` | `/users/me/notification-settings` | 1 | — |
| patient | `/settings/notifications` | `patient/nabd plus/app/settings/notifications.tsx` | — | 7 | تفاعلات دون عقد API حرفي في الملف |
| patient | `/settings/privacy` | `patient/nabd plus/app/settings/privacy.tsx` | `/users/me/privacy-settings` | 5 | — |
| patient | `/settings/security` | `patient/nabd plus/app/settings/security.tsx` | `/users/me/security-settings`<br>`/users/me/change-password` | 11 | مؤشر بيانات بديلة/محاكاة يحتاج مراجعة |
| patient | `/settings/support-chat` | `patient/nabd plus/app/settings/support-chat.tsx` | — | 0 | — |
| patient | `/settings/terms` | `patient/nabd plus/app/settings/terms.tsx` | — | 1 | تفاعلات دون عقد API حرفي في الملف |
| patient | `/shared/location-picker` | `patient/nabd plus/app/shared/location-picker.tsx` | `/users/me/addresses` | 34 | مؤشر بيانات بديلة/محاكاة يحتاج مراجعة |
| patient | `/support/chat` | `patient/nabd plus/app/support/chat.tsx` | ديناميكي | 12 | مؤشر بيانات بديلة/محاكاة يحتاج مراجعة<br>استدعاء API ديناميكي يحتاج تتبعاً يدوياً<br>تفاعلات دون عقد API حرفي في الملف |
| patient | `/support/ticket` | `patient/nabd plus/app/support/ticket.tsx` | ديناميكي | 8 | استدعاء API ديناميكي يحتاج تتبعاً يدوياً<br>تفاعلات دون عقد API حرفي في الملف |
| patient | `/voice` | `patient/nabd plus/app/voice/index.tsx` | — | 15 | مؤشر بيانات بديلة/محاكاة يحتاج مراجعة<br>تفاعلات دون عقد API حرفي في الملف |
| patient | `/wallet/cards` | `patient/nabd plus/app/wallet/cards.tsx` | `/wallet/cards`<br>`/wallet/cards/${cardId}` | 12 | — |
| patient | `/wallet/hub` | `patient/nabd plus/app/wallet/hub.tsx` | `/wallet/spending-data` | 12 | — |
| patient | `/wallet/topup` | `patient/nabd plus/app/wallet/topup.tsx` | `/wallet/topup` | 5 | — |
| patient | `/wallet/transactions` | `patient/nabd plus/app/wallet/transactions.tsx` | `/wallet/transactions` | 6 | — |
| patient | `/wallet/transfer` | `patient/nabd plus/app/wallet/transfer.tsx` | `/wallet/transfer` | 5 | — |
| patient | `/wearables/hub` | `patient/nabd plus/app/wearables/hub.tsx` | `/health/vitals`<br>`/health/sleep` | 2 | مؤشر بيانات بديلة/محاكاة يحتاج مراجعة |
| provider | `provider:auth/AuthScreens.tsx` | `provider/NabdProvider/src/screens/auth/AuthScreens.tsx` | `${API_BASE}/provider/auth/forgot-password`<br>`${API_BASE}/provider/auth/reset-password` | 43 | مؤشر بيانات بديلة/محاكاة يحتاج مراجعة |
| provider | `provider:auth/PendingDashboard.tsx` | `provider/NabdProvider/src/screens/auth/PendingDashboard.tsx` | `/auth/send-otp`<br>`/auth/verify-otp` | 5 | مؤشر بيانات بديلة/محاكاة يحتاج مراجعة |
| provider | `provider:doctor/DoctorDashboard.tsx` | `provider/NabdProvider/src/screens/doctor/DoctorDashboard.tsx` | `${API_BASE}/calls/provider/waiting-room`<br>`${API_BASE}/calls/provider/ping-patient`<br>`${API_BASE}/calls/provider/no-show`<br>`/provider/jobs/queue?status=incoming&kind=consultation`<br>`/provider/jobs/queue?status=active`<br>`/provider/stats/today`<br>`/provider/jobs/`<br>`/provider/jobs/consultation/${insuranceModalReq.id}/insurance`<br>`/provider/jobs/queue?status=active&kind=consultation`<br>`/provider/consultation/end`<br>`/medicines`<br>`/prescriptions/create`<br>`/provider/requests/${apt?.id ||`<br>`/provider/features/referrals`<br>`/provider/wallet`<br>`/provider/wallet/transactions`<br>`/chats/provider`<br>`/chats/${chat.id}/messages`<br>`/chats/${activeChat.id}/messages`<br>`/provider/settings/delta`<br>`/provider/jobs/consultation/${apt.id}/insurance`<br>`/provider/notifications`<br>`/provider/directory`<br>`/provider/capabilities/doctor-sessions`<br>`/provider/capabilities/doctor-sessions/${id}`<br>`/provider/profile`<br>`/provider/chat/send` | 150 | مؤشر بيانات بديلة/محاكاة يحتاج مراجعة |
| provider | `provider:doctor/DoctorRegistration.tsx` | `provider/NabdProvider/src/screens/doctor/DoctorRegistration.tsx` | ديناميكي | 65 | مؤشر بيانات بديلة/محاكاة يحتاج مراجعة<br>استدعاء API ديناميكي يحتاج تتبعاً يدوياً<br>تفاعلات دون عقد API حرفي في الملف |
| provider | `provider:doctor/FacilityInvitationsScreen.tsx` | `provider/NabdProvider/src/screens/doctor/FacilityInvitationsScreen.tsx` | — | 3 | تفاعلات دون عقد API حرفي في الملف |
| provider | `provider:doctor/components/DoctorHeader.tsx` | `provider/NabdProvider/src/screens/doctor/components/DoctorHeader.tsx` | — | 4 | تفاعلات دون عقد API حرفي في الملف |
| provider | `provider:doctor/components/DoctorQueueList.tsx` | `provider/NabdProvider/src/screens/doctor/components/DoctorQueueList.tsx` | — | 3 | تفاعلات دون عقد API حرفي في الملف |
| provider | `provider:doctor/components/DoctorStatsRow.tsx` | `provider/NabdProvider/src/screens/doctor/components/DoctorStatsRow.tsx` | — | 0 | — |
| provider | `provider:doctor/components/DoctorUrgentRequests.tsx` | `provider/NabdProvider/src/screens/doctor/components/DoctorUrgentRequests.tsx` | — | 3 | تفاعلات دون عقد API حرفي في الملف |
| provider | `provider:doctor/fix_home.js` | `provider/NabdProvider/src/screens/doctor/fix_home.js` | — | 13 | مؤشر بيانات بديلة/محاكاة يحتاج مراجعة<br>تفاعلات دون عقد API حرفي في الملف |
| provider | `provider:facility/DischargeSummaryScreen.tsx` | `provider/NabdProvider/src/screens/facility/DischargeSummaryScreen.tsx` | — | 2 | مؤشر بيانات بديلة/محاكاة يحتاج مراجعة<br>تفاعلات دون عقد API حرفي في الملف |
| provider | `provider:facility/FacilityAnnouncementsScreen.tsx` | `provider/NabdProvider/src/screens/facility/FacilityAnnouncementsScreen.tsx` | — | 2 | مؤشر بيانات بديلة/محاكاة يحتاج مراجعة<br>تفاعلات دون عقد API حرفي في الملف |
| provider | `provider:facility/FacilityAuditLogScreen.tsx` | `provider/NabdProvider/src/screens/facility/FacilityAuditLogScreen.tsx` | `/provider/facility/audit-logs` | 1 | — |
| provider | `provider:facility/FacilityDashboard.tsx` | `provider/NabdProvider/src/screens/facility/FacilityDashboard.tsx` | `/facility/inbox`<br>`/facility/beds/wards`<br>`/facility/surgeries/schedule`<br>`/provider/jobs/queue?status=active&kind=appointment&today=true`<br>`/provider/facility/subaccounts`<br>`/provider/features/staff`<br>`/provider/facility/shifts`<br>`/facility/beds/wards/${ward.id}/beds`<br>`/facility/beds/admission`<br>`/facility/beds/discharge/${admissionId}`<br>`/facility/surgeries/book`<br>`/provider-deltas`<br>`/home-care/bookings/nursing/all`<br>`/home-care/providers?availability=now`<br>`/home-care/bookings/${selectedBooking.id}/assign` | 103 | مؤشر بيانات بديلة/محاكاة يحتاج مراجعة |
| provider | `provider:facility/FacilityInternalChatScreen.tsx` | `provider/NabdProvider/src/screens/facility/FacilityInternalChatScreen.tsx` | `/chat/channels`<br>`/chat/messages/${activeChat}` | 5 | مؤشر بيانات بديلة/محاكاة يحتاج مراجعة |
| provider | `provider:facility/FacilityInvitationScreen.tsx` | `provider/NabdProvider/src/screens/facility/FacilityInvitationScreen.tsx` | ديناميكي | 3 | مؤشر بيانات بديلة/محاكاة يحتاج مراجعة<br>استدعاء API ديناميكي يحتاج تتبعاً يدوياً<br>تفاعلات دون عقد API حرفي في الملف |
| provider | `provider:facility/FacilityLeaveRequestsScreen.tsx` | `provider/NabdProvider/src/screens/facility/FacilityLeaveRequestsScreen.tsx` | `/provider/leave-requests`<br>`/provider/leave-requests/action` | 3 | — |
| provider | `provider:facility/FacilityPatientTrackerScreen.tsx` | `provider/NabdProvider/src/screens/facility/FacilityPatientTrackerScreen.tsx` | `/provider/facility/patients/active` | 5 | — |
| provider | `provider:facility/FacilityProfileConfigScreen.tsx` | `provider/NabdProvider/src/screens/facility/FacilityProfileConfigScreen.tsx` | ديناميكي | 9 | مؤشر بيانات بديلة/محاكاة يحتاج مراجعة<br>استدعاء API ديناميكي يحتاج تتبعاً يدوياً<br>تفاعلات دون عقد API حرفي في الملف |
| provider | `provider:facility/FacilityRegistration.tsx` | `provider/NabdProvider/src/screens/facility/FacilityRegistration.tsx` | ديناميكي | 55 | مؤشر بيانات بديلة/محاكاة يحتاج مراجعة<br>استدعاء API ديناميكي يحتاج تتبعاً يدوياً<br>تفاعلات دون عقد API حرفي في الملف |
| provider | `provider:facility/FacilityResourcesScreen.tsx` | `provider/NabdProvider/src/screens/facility/FacilityResourcesScreen.tsx` | — | 9 | تفاعلات دون عقد API حرفي في الملف |
| provider | `provider:facility/FacilityUnifiedCalendarScreen.tsx` | `provider/NabdProvider/src/screens/facility/FacilityUnifiedCalendarScreen.tsx` | `/provider/facility/calendar` | 1 | — |
| provider | `provider:lab/LabDashboard.tsx` | `provider/NabdProvider/src/screens/lab/LabDashboard.tsx` | `/labs/provider/inbox`<br>`/labs/samples`<br>`/labs/bookings/${order.id}/state`<br>`/labs/bookings/${order.id}/assign-technician`<br>`/labs/bookings/${order.id}/reschedule`<br>`/labs/samples/${sam.id}/stage`<br>`/labs/samples/${sample.id}/upload-report`<br>`/labs/samples/${sample.id}/stage`<br>`/labs/bookings/${sample.lab_order_id || sample.id}/upload-report`<br>`/labs/packages`<br>`/approval-workflow/requests`<br>`/labs/bookings/${order.id}/gps`<br>`/labs/bookings/${order?.id}/state`<br>`/labs/bookings/${order?.id}/emergency`<br>`/labs/bookings/${order?.id}/reassign`<br>`/labs/bookings/${order?.id ||`<br>`/labs/bookings/${selectedOrder.id}/insurance`<br>`/provider/capabilities/lab-services` | 89 | مؤشر بيانات بديلة/محاكاة يحتاج مراجعة |
| provider | `provider:lab/LabRegistration.tsx` | `provider/NabdProvider/src/screens/lab/LabRegistration.tsx` | ديناميكي | 78 | مؤشر بيانات بديلة/محاكاة يحتاج مراجعة<br>استدعاء API ديناميكي يحتاج تتبعاً يدوياً<br>تفاعلات دون عقد API حرفي في الملف |
| provider | `provider:nursing/NursingDashboard.tsx` | `provider/NabdProvider/src/screens/nursing/NursingDashboard.tsx` | `/provider/jobs/queue?kind=nursing&status=incoming`<br>`/provider/jobs/queue?kind=nursing&status=active`<br>`/provider/jobs/queue?kind=nursing&status=completed`<br>`/nursing/visits/${incomingRequest.id}/respond`<br>`/home-care/provider/availability`<br>`/nursing/jobs/active`<br>`/home-care/bookings/${order.id}/respond`<br>`/provider/nursing/checklist`<br>`/home-care/bookings/${order.id}/gps`<br>`/home-care/bookings/${order.id}/check-in`<br>`/nursing/notes`<br>`/home-care/bookings/${order.id}/visit-report`<br>`/provider/nursing/supplies`<br>`/home-care/inventory/request`<br>`/provider-deltas`<br>`/nursing/coverage/verify-gps`<br>`/provider/profile`<br>`/provider/schedule/settings` | 76 | مؤشر بيانات بديلة/محاكاة يحتاج مراجعة |
| provider | `provider:nursing/NursingFieldOps.tsx` | `provider/NabdProvider/src/screens/nursing/NursingFieldOps.tsx` | `/nursing/visits/${order.id}/${endpoint}` | 13 | مؤشر بيانات بديلة/محاكاة يحتاج مراجعة |
| provider | `provider:nursing/NursingRegistration.tsx` | `provider/NabdProvider/src/screens/nursing/NursingRegistration.tsx` | ديناميكي | 62 | مؤشر بيانات بديلة/محاكاة يحتاج مراجعة<br>استدعاء API ديناميكي يحتاج تتبعاً يدوياً<br>تفاعلات دون عقد API حرفي في الملف |
| provider | `provider:pharmacy/PharmacyDashboard.tsx` | `provider/NabdProvider/src/screens/pharmacy/PharmacyDashboard.tsx` | `/pharmacy/orders/incoming`<br>`/provider/pharmacy/orders/${orderId}/accept`<br>`/api/v1/pharmacy/orders/${rejectOrderId}/reject`<br>`/pharmacy/prescriptions/${rxNumber}`<br>`/insurance/claims/submit`<br>`/provider/pharmacy/b2b/voice-to-order`<br>`/provider/pharmacy/returns`<br>`/pharmacy/reports/eod`<br>`/provider/pharmacy/returns/RET-421/decide`<br>`/provider/pharmacy/orders/123/dispatch`<br>`/provider/pharmacy/orders/${orderId}/insurance`<br>`/provider/pharmacy/orders/${orderId}/submit-basket`<br>`/provider-deltas` | 64 | مؤشر بيانات بديلة/محاكاة يحتاج مراجعة |
| provider | `provider:pharmacy/PharmacyRegistration.tsx` | `provider/NabdProvider/src/screens/pharmacy/PharmacyRegistration.tsx` | ديناميكي | 57 | مؤشر بيانات بديلة/محاكاة يحتاج مراجعة<br>استدعاء API ديناميكي يحتاج تتبعاً يدوياً<br>تفاعلات دون عقد API حرفي في الملف |
| provider | `provider:radiology/RadiologyDashboard.tsx` | `provider/NabdProvider/src/screens/radiology/RadiologyDashboard.tsx` | `/radiology/provider/inbox`<br>`/radiology/bookings/${order.id}`<br>`/radiology/bookings/${currentOrder.id}/${action}`<br>`/radiology/bookings/${currentOrder.id}/insurance-approval`<br>`/radiology/bookings/${currentOrder.id}/abort`<br>`/radiology/bookings/${currentOrder.id}/state`<br>`/radiology/bookings/${order.id}/upload-report`<br>`/radiology/bookings/${order.id}/submit-report-for-review`<br>`/radiology/bookings/${order.id}/approve-report`<br>`/provider/capabilities/radiology-services`<br>`/radiology/catalog/delta-request` | 37 | مؤشر بيانات بديلة/محاكاة يحتاج مراجعة |
| provider | `provider:radiology/RadiologyRegistration.tsx` | `provider/NabdProvider/src/screens/radiology/RadiologyRegistration.tsx` | ديناميكي | 78 | مؤشر بيانات بديلة/محاكاة يحتاج مراجعة<br>استدعاء API ديناميكي يحتاج تتبعاً يدوياً<br>تفاعلات دون عقد API حرفي في الملف |
| provider | `provider:shared/BlueprintScreens.tsx` | `provider/NabdProvider/src/screens/shared/BlueprintScreens.tsx` | `${API_BASE}/home-care/reports/soap`<br>`${API_BASE}/home-care/sos`<br>`${API_BASE}/home-care/trip/start`<br>`/provider/features/promotions`<br>`/provider/features/crm/patients/${pat.id}`<br>`/provider/features/crm/patients/${selectedPat.id}`<br>`/provider/features/referrals` | 38 | مؤشر بيانات بديلة/محاكاة يحتاج مراجعة |
| provider | `provider:shared/LiveKitRoomProvider.tsx` | `provider/NabdProvider/src/screens/shared/LiveKitRoomProvider.tsx` | `/calls/${roomId}/join` | 3 | مؤشر بيانات بديلة/محاكاة يحتاج مراجعة |
| provider | `provider:shared/PharmacyChatResponder.tsx` | `provider/NabdProvider/src/screens/shared/PharmacyChatResponder.tsx` | `/pharmacy/chat/threads/${threadId}/messages` | 7 | مؤشر بيانات بديلة/محاكاة يحتاج مراجعة |
| provider | `provider:shared/ProviderHome.tsx` | `provider/NabdProvider/src/screens/shared/ProviderHome.tsx` | `/pharmacy/orders/pending`<br>`/calls/provider/waiting-room` | 6 | — |
| provider | `provider:shared/RealScreens.tsx` | `provider/NabdProvider/src/screens/shared/RealScreens.tsx` | `/provider/reviews`<br>`/provider/reviews/${id}/reply`<br>`/provider/working-hours`<br>`/auth/change-password`<br>`/support/tickets` | 8 | مؤشر بيانات بديلة/محاكاة يحتاج مراجعة |
| provider | `provider:shared/RealScreensExtended.tsx` | `provider/NabdProvider/src/screens/shared/RealScreensExtended.tsx` | `/pharmacy/products`<br>`/pharmacy/shortages/report` | 6 | مؤشر بيانات بديلة/محاكاة يحتاج مراجعة |
| provider | `provider:shared/RegistrationSuccess.tsx` | `provider/NabdProvider/src/screens/shared/RegistrationSuccess.tsx` | — | 10 | مؤشر بيانات بديلة/محاكاة يحتاج مراجعة<br>تفاعلات دون عقد API حرفي في الملف |
| provider | `provider:shared/SharedScreens.tsx` | `provider/NabdProvider/src/screens/shared/SharedScreens.tsx` | `${API_BASE}/jobs`<br>`${API_BASE}/drugs`<br>`${API_BASE}/prescriptions/create`<br>`/chats/provider`<br>`/chats/${conv.id}/messages`<br>`/provider/notifications`<br>`/support/tickets`<br>`/provider/dashboard/stats?period=${period}`<br>`/provider/banks`<br>`/provider/wallet/withdraw`<br>`/nursing/wallet?provider_id=${user?.id}` | 125 | مؤشر بيانات بديلة/محاكاة يحتاج مراجعة |
| admin | `admin:DashboardHome.js` | `admin/Napd-admin/frontend/src/pages/DashboardHome.js` | ديناميكي | 0 | استدعاء API ديناميكي يحتاج تتبعاً يدوياً |
| admin | `admin:ProvidersManagement.js` | `admin/Napd-admin/frontend/src/pages/ProvidersManagement.js` | ديناميكي | 4 | استدعاء API ديناميكي يحتاج تتبعاً يدوياً<br>تفاعلات دون عقد API حرفي في الملف |
| admin | `admin:UsersManagement.js` | `admin/Napd-admin/frontend/src/pages/UsersManagement.js` | ديناميكي | 1 | استدعاء API ديناميكي يحتاج تتبعاً يدوياً<br>تفاعلات دون عقد API حرفي في الملف |
| admin | `admin:_app.tsx` | `admin/Napd-admin/web-admin/src/pages/_app.tsx` | — | 0 | — |
| admin | `admin:_document.tsx` | `admin/Napd-admin/web-admin/src/pages/_document.tsx` | — | 0 | — |
| admin | `admin:admin/audit-logs.tsx` | `admin/Napd-admin/web-admin/src/pages/admin/audit-logs.tsx` | `${API_BASE}/api/v1/admin/governance/audit-logs` | 1 | — |
| admin | `admin:admin/config-portal.tsx` | `admin/Napd-admin/web-admin/src/pages/admin/config-portal.tsx` | ديناميكي | 5 | استدعاء API ديناميكي يحتاج تتبعاً يدوياً<br>تفاعلات دون عقد API حرفي في الملف |
| admin | `admin:admin/dashboard.tsx` | `admin/Napd-admin/web-admin/src/pages/admin/dashboard.tsx` | ديناميكي | 0 | مؤشر بيانات بديلة/محاكاة يحتاج مراجعة<br>استدعاء API ديناميكي يحتاج تتبعاً يدوياً |
| admin | `admin:admin/disputes.tsx` | `admin/Napd-admin/web-admin/src/pages/admin/disputes.tsx` | `${API_BASE}/api/v1/admin/disputes`<br>`${API_BASE}/api/v1/admin/authority/orders/${id}/force-cancel` | 3 | — |
| admin | `admin:admin/financial-ledger.tsx` | `admin/Napd-admin/web-admin/src/pages/admin/financial-ledger.tsx` | ديناميكي | 4 | مؤشر بيانات بديلة/محاكاة يحتاج مراجعة<br>استدعاء API ديناميكي يحتاج تتبعاً يدوياً<br>تفاعلات دون عقد API حرفي في الملف |
| admin | `admin:admin/fraud-monitoring.tsx` | `admin/Napd-admin/web-admin/src/pages/admin/fraud-monitoring.tsx` | ديناميكي | 0 | استدعاء API ديناميكي يحتاج تتبعاً يدوياً |
| admin | `admin:admin/nursing-portal.tsx` | `admin/Napd-admin/web-admin/src/pages/admin/nursing-portal.tsx` | `/admin/nursing/requests`<br>`/admin/nursing/requests/${requestId}/assign` | 1 | — |
| admin | `admin:admin/payouts.tsx` | `admin/Napd-admin/web-admin/src/pages/admin/payouts.tsx` | `${API_BASE}/api/v1/admin/finance/withdrawals/pending`<br>`${API_BASE}/api/v1/admin/finance/withdrawals/${id}/execute` | 2 | — |
| admin | `admin:admin/provider-audits.tsx` | `admin/Napd-admin/web-admin/src/pages/admin/provider-audits.tsx` | `/admin/provider-deltas/pending`<br>`/admin/provider-deltas/${id}/approve`<br>`/admin/provider-deltas/${id}/reject` | 2 | — |
| admin | `admin:admin/provider-moderation.tsx` | `admin/Napd-admin/web-admin/src/pages/admin/provider-moderation.tsx` | ديناميكي | 10 | مؤشر بيانات بديلة/محاكاة يحتاج مراجعة<br>استدعاء API ديناميكي يحتاج تتبعاً يدوياً<br>تفاعلات دون عقد API حرفي في الملف |
| admin | `admin:admin/users-management.tsx` | `admin/Napd-admin/web-admin/src/pages/admin/users-management.tsx` | `/admin/users`<br>`/admin/users/${id}/ban` | 1 | مؤشر بيانات بديلة/محاكاة يحتاج مراجعة |
| admin | `admin:api/hello.ts` | `admin/Napd-admin/web-admin/src/pages/api/hello.ts` | ديناميكي | 0 | استدعاء API ديناميكي يحتاج تتبعاً يدوياً |
| admin | `admin:index.tsx` | `admin/Napd-admin/web-admin/src/pages/index.tsx` | — | 0 | — |

## المخرجات التفصيلية

يتضمن ملف JSON جميع مراجع أسطر التفاعل والنصوص الظاهرة المرشحة لكل شاشة. كما يحتوي ملف CSV على **3822** صف تفاعل، مع الشاشة والملف والسطر ومرشحات API الخاصة بالشاشة، ليُستخدم في جولة الربط اليدوية وE2E لاحقاً.