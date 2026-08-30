# Patient Web ↔ Mobile Parity Matrix (auto-generated, 2026-08-30)

## ملخص
| المؤشر | العدد |
|---|---:|
| شاشات Mobile حقيقية | 200 |
| صفحات Web (routes) | 85 |
| Mobile لها مقابل Web تقريبي | 50 (25%) |
| Mobile بلا مقابل Web | 103 |

## منهجية
مطابقة دلالية على مقاطع المسار (مثل doctor/booking)؛ ≥50% تطابق = "موجود تقريبياً" ويحتاج تأكيداً يدوياً route-level؛ أقل من ذلك = ناقص.

## Mobile بلا مقابل Web (فجوات parity)
- ``
- ``
- ``
- `/ai/monthly-report`
- `/ai/prescription-translator`
- `/ai/skin-analysis`
- `/community/post-detail`
- `/consultations/appointment-detail`
- `/consultations/booking-confirm`
- `/consultations/booking-pending`
- `/consultations/booking-success`
- `/consultations/call-history`
- `/consultations/cancel-reschedule`
- `/consultations/chat-with-doctor`
- `/consultations/clinic-confirm`
- `/consultations/clinic-location`
- `/consultations/doctor-profile`
- `/consultations/doctor-search`
- `/consultations/follow-up`
- `/consultations/home-visit-tracking`
- `/consultations/incoming-call`
- `/consultations/post-call-rating`
- `/consultations/prescription-from-doctor`
- `/consultations/share-report`
- `/consultations/specialty-select`
- `/consultations/video-call`
- `/consultations/virtual-waiting-room`
- `/consultations/waiting-room`
- `/delivery/address-select`
- `/diagnostics/book-sample`
- `/diagnostics/booking-success`
- `/diagnostics/insurance-approval`
- `/diagnostics/insurance-upload`
- `/diagnostics/lab-comparison`
- `/diagnostics/my-results`
- `/diagnostics/package-detail`
- `/diagnostics/results-history`
- `/diagnostics/test-detail`
- `/drug-scanner`
- `/emergency/sos-active`
- `/family/member-health`
- `/family/permission-request`
- `/health/actionable-order`
- `/health/conditions-allergies`
- `/health/edit-profile`
- `/health/family-hub`
- `/health/medication-reminder-add`
- `/health/medication-reminder-list`
- `/insurance/add-policy`
- `/insurance/approval-pending`
- `/insurance/benefits-summary`
- `/insurance/claim-tracking`
- `/insurance/coverage-check`
- `/insurance/network-providers`
- `/insurance/payment-split`
- `/insurance/policy-detail`
- `/insurance/refund-status`
- `/insurance/submit-claim`
- `/language`
- `/map`
- `/maternity/fetus-data`
- `/nursing/live-tracking`
- `/nursing/nurse-profile`
- `/nursing/service-details`
- `/nursing/service-info`
- `/nutrition/body-target`
- `/nutrition/daily-tracker`
- `/nutrition/log-meal`
- `/payments/failed`
- `/payments/failure`
- `/payments/processing`
- `/payments/success`
- `/permissions`
- `/pharmacy`
- `/pharmacy/barcode-scanner`
- `/pharmacy/broadcast-status`
- `/pharmacy/chat-with-pharmacist`
- `/pharmacy/custom-item`
- `/pharmacy/drug-not-found`
- `/pharmacy/filters`
- `/pharmacy/final-quote`
- `/pharmacy/insurance-decision`
- `/pharmacy/manual-order`
- `/pharmacy/medicine-compare`
- `/pharmacy/order-confirm`
- `/pharmacy/order-history`
- `/pharmacy/order-tracking`
- `/pharmacy/payment`
- `/pharmacy/pharmacist-chat`
- `/pharmacy/product-detail`
- `/pharmacy/reorder`
- `/pharmacy/rx-order`
- `/pharmacy/scan-prescription`
- `/pharmacy/waiting-for-pharmacy`
- `/provider-info`
- `/reports/view-report`
- `/returns/new-request`
- `/reviews`
- `/room/[id]`
- `/s/[type]/[slug]`
- `/shared/location-picker`
- `/voice`
- `/wearables/hub`

## ملاحظة حدود الدقة
هذه مطابقة مسارات، لا إثبات اكتمال workflow. الصفحة "الموجودة" قد تكون ناقصة حقول/أزرار/حالات؛ تُدقق في مرحلة الـworkflow parity التالية.
