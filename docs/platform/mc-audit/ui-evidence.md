# Client evidence lists (Phase 1, read-only)

Every hit of the scans below, as `file: line numbers`, per concern and per app. The scans are plain `grep -rnE` over `.ts/.tsx/.js/.mjs` source, excluding tests, `node_modules`, locale/message catalogues and generated translation files. A hit can be a comment or a test-like literal: the analysis rows in `ui-impact.md` are the curated reading; this file is the complete list so nothing is missed. Regenerate by running the pattern shown under each heading.

## P1 Phone prefix, local format and phone regexes

Pattern: `\+966\|\b966\d\|\^05\|startsWith\(['\"]966['\"]\)\|startsWith\(['\"]05['\"]\)\|\\\\d\{9\}`

### patient-app: 6 hits in 5 files

- `patient-app/src/auth/patientAuth.ts`: 11, 20
- `patient-app/src/components/auth/AuthKit.tsx`: 106
- `patient-app/src/core/config/ConfigManager.ts`: 225
- `patient-app/src/utils/bidi.ts`: 1
- `patient-app/src/utils/login-credentials.ts`: 5

### patient-web: 0 hits in 0 files


### provider-app: 5 hits in 2 files

- `provider-app/src/components/ui.tsx`: 223
- `provider-app/src/security/Security.ts`: 204, 205, 206, 207

### admin: 0 hits in 0 files


## P2 Currency code, symbol and halala maths

Pattern: `['\"]SAR['\"]\| SAR\b\|ر\.س\|ريال\|_halalas\|halala`

### patient-app: 22 hits in 16 files

- `patient-app/app/payments/result.tsx`: 157
- `patient-app/app/pharmacy/insurance-decision.tsx`: 188
- `patient-app/app/pharmacy/payment.tsx`: 183
- `patient-app/src/components/insurance/CopayFields.tsx`: 10
- `patient-app/src/components/nursing/NursingKit.tsx`: 65
- `patient-app/src/components/nursing/NursingServiceList.tsx`: 14
- `patient-app/src/components/pharmacy/OfferKit.tsx`: 86, 89, 122, 220, 256
- `patient-app/src/core/config/ConfigManager.ts`: 224
- `patient-app/src/core/domain/value-objects/index.ts`: 44
- `patient-app/src/core/platform/commerce/CartManager.ts`: 86, 87, 100
- `patient-app/src/data/database/schema/tables.ts`: 225
- `patient-app/src/i18n/index.ts`: 167
- `patient-app/src/utils/differentiators.ts`: 39
- `patient-app/src/utils/doctorSummary.ts`: 30
- `patient-app/src/utils/receipt.ts`: 131
- `patient-app/src/utils/useOrderingQuote.ts`: 40

### patient-web: 32 hits in 24 files

- `patient-web/app/[locale]/p/[slug]/page.tsx`: 150
- `patient-web/app/agent-skills/booking/skill.md/route.ts`: 11
- `patient-web/app/api/agent-markdown/route.ts`: 46
- `patient-web/app/api/appointments/[appointmentId]/payment-capabilities/route.ts`: 11
- `patient-web/app/api/insurance/requests/[requestId]/payment-capabilities/route.ts`: 11
- `patient-web/app/api/payments/pharmacy/[orderId]/capabilities/route.ts`: 11
- `patient-web/app/llms-full/[file]/route.ts`: 24
- `patient-web/app/llms.txt/route.ts`: 39
- `patient-web/components-next/consultation-payment-action.tsx`: 12
- `patient-web/components-next/diagnostics-insurance-approval-client.tsx`: 113
- `patient-web/components-next/diagnostics/catalog-rows.ts`: 31, 36
- `patient-web/components-next/insurance/insurance-request-view.tsx`: 22
- `patient-web/components-next/nursing/nursing-offers.ts`: 8
- `patient-web/components-next/pharmacy-offers/format.ts`: 3, 9, 11
- `patient-web/lib/api/offers.ts`: 79
- `patient-web/lib/api/payments.ts`: 12
- `patient-web/lib/consult/doctor-summary.ts`: 34
- `patient-web/lib/diagnostics-format.ts`: 3
- `patient-web/lib/format-price.ts`: 3, 6, 9, 18
- `patient-web/lib/legal/embedded-policies.ts`: 9, 33
- `patient-web/lib/merchant-feed.ts`: 17, 31
- `patient-web/lib/nursing/service-pages.ts`: 62
- `patient-web/lib/receipt/model.ts`: 72
- `patient-web/lib/seo/json-ld.ts`: 37

### provider-app: 18 hits in 16 files

- `provider-app/src/screens/doctor/components/DoctorStatsRow.tsx`: 39
- `provider-app/src/screens/facility/facility/FacilityOrderDetail.tsx`: 65
- `provider-app/src/screens/facility/facility/FacilityOrdersTab.tsx`: 73
- `provider-app/src/screens/lab/LabDashboard.tsx`: 171
- `provider-app/src/screens/nursing/NursingDashboard.tsx`: 423
- `provider-app/src/screens/nursing/NursingRegistration.tsx`: 518, 560
- `provider-app/src/screens/ordering/common.tsx`: 80
- `provider-app/src/screens/pharmacy/PharmacyMyOffers.tsx`: 62
- `provider-app/src/screens/pharmacy/offersList.ts`: 62
- `provider-app/src/screens/shared/blueprint/PharmacyBroadcastResponse.tsx`: 198
- `provider-app/src/screens/shared/blueprint/SubscriptionsAdsScreen.tsx`: 52, 53
- `provider-app/src/screens/shared/blueprint/revenuePeriods.ts`: 17
- `provider-app/src/screens/shared/myServicesLogic.ts`: 18
- `provider-app/src/screens/shared/shared/MedicalDrugIndexScreen.tsx`: 78
- `provider-app/src/screens/shared/shared/ProviderWalletScreen.tsx`: 70
- `provider-app/src/utils/payoutErrors.ts`: 9

### admin: 67 hits in 30 files

- `admin/src/components/MedicineQuickEdit.tsx`: 59, 165
- `admin/src/components/PharmacyOwnDeliveryAdmin.tsx`: 89, 92
- `admin/src/components/ProviderFullDetail.tsx`: 395, 396, 397, 403
- `admin/src/lib/refund-policy.ts`: 17
- `admin/src/lib/service-offers.ts`: 21
- `admin/src/pages/admin/analytics-suite.tsx`: 45, 55
- `admin/src/pages/admin/analytics.tsx`: 7, 9
- `admin/src/pages/admin/catalog-manager.tsx`: 23, 325
- `admin/src/pages/admin/command-center.tsx`: 23, 59
- `admin/src/pages/admin/commissions.tsx`: 96, 100, 128, 130
- `admin/src/pages/admin/config-portal.tsx`: 348
- `admin/src/pages/admin/content-growth.tsx`: 62
- `admin/src/pages/admin/crm.tsx`: 18
- `admin/src/pages/admin/dashboard.tsx`: 191
- `admin/src/pages/admin/disputes.tsx`: 68, 74
- `admin/src/pages/admin/finance-suite.tsx`: 44, 52, 53, 69, 70, 71, 72
- `admin/src/pages/admin/financial-ledger.tsx`: 124, 134, 198, 199, 200, 201, 275
- `admin/src/pages/admin/insurance-queue.tsx`: 58, 103, 104, 131, 132
- `admin/src/pages/admin/loyalty-config.tsx`: 103
- `admin/src/pages/admin/medicines-catalog.tsx`: 461
- `admin/src/pages/admin/orders/[kind]/[id].tsx`: 74
- `admin/src/pages/admin/orders/index.tsx`: 72
- `admin/src/pages/admin/payouts.tsx`: 76, 101, 128
- `admin/src/pages/admin/pharmacy-price-review.tsx`: 13
- `admin/src/pages/admin/pharmacy-procurement.tsx`: 163, 192
- `admin/src/pages/admin/price-override-audit.tsx`: 111, 112
- `admin/src/pages/admin/price-reviews.tsx`: 18, 173, 176
- `admin/src/pages/admin/returns.tsx`: 116, 121
- `admin/src/pages/admin/today.tsx`: 35, 166
- `admin/src/pages/admin/users-management.tsx`: 498

## P3 Time zone, calendar and number locale (Riyadh, ar-SA)

Pattern: `Asia/Riyadh\|riyadh[A-Z]\|Riyadh calendar\|UTC\+3\|ar-SA`

### patient-app: 32 hits in 9 files

- `patient-app/app/diagnostics/when.tsx`: 19, 33, 34
- `patient-app/app/nursing/nurse-profile.tsx`: 22, 161
- `patient-app/src/components/consult/ConsultBooking.tsx`: 9, 26, 35, 36
- `patient-app/src/components/consult/ConsultKit.tsx`: 116
- `patient-app/src/components/screen/ScreenKit.tsx`: 22
- `patient-app/src/utils/dates.ts`: 8, 62, 66, 82
- `patient-app/src/utils/orderingBooking.ts`: 17, 128, 130, 147
- `patient-app/src/utils/prescription-view.ts`: 49
- `patient-app/src/utils/riyadh.ts`: 2, 3, 6, 11, 15, 16, 17, 20, 21, 22, 26, 27

### patient-web: 34 hits in 9 files

- `patient-web/app/[locale]/dashboard/page.tsx`: 21
- `patient-web/app/[locale]/nutrition/page.tsx`: 128
- `patient-web/components-next/home-care-booking-form.tsx`: 20, 26, 31, 32, 231
- `patient-web/components-next/ordering/when-client.tsx`: 18, 309
- `patient-web/lib/api/dashboard-extras.ts`: 32
- `patient-web/lib/consult/prescription-view.ts`: 55, 57
- `patient-web/lib/format-slot.ts`: 1
- `patient-web/lib/ordering/schedule.ts`: 9, 38, 40, 55, 57, 62, 66, 71, 152
- `patient-web/lib/time/riyadh.ts`: 2, 3, 6, 11, 15, 16, 17, 20, 21, 22, 26, 27

### provider-app: 21 hits in 17 files

- `provider-app/src/i18n/index.ts`: 31, 47
- `provider-app/src/screens/doctor/doctor/AppointmentDetailScreen.tsx`: 147, 151
- `provider-app/src/screens/doctor/doctor/MedicalOrderComposer.tsx`: 146
- `provider-app/src/screens/doctor/doctor/PreVisitChatScreen.tsx`: 109
- `provider-app/src/screens/doctor/doctor/StatisticsScreen.tsx`: 64
- `provider-app/src/screens/doctor/doctor/_shared.tsx`: 71
- `provider-app/src/screens/facility/FacilityInternalChatScreen.tsx`: 44
- `provider-app/src/screens/facility/facility/FacilityOrdersTab.tsx`: 73, 108
- `provider-app/src/screens/nursing/NursingDashboard.tsx`: 149
- `provider-app/src/screens/nursing/NursingFieldOps.tsx`: 197
- `provider-app/src/screens/ordering/common.tsx`: 80
- `provider-app/src/screens/pharmacy/PharmacyMyOffers.tsx`: 33
- `provider-app/src/screens/shared/RealScreensExtended.tsx`: 268
- `provider-app/src/screens/shared/shared/SupportCenter.tsx`: 78
- `provider-app/src/screens/shared/shared/WithdrawalWorkflow.tsx`: 321
- `provider-app/src/utils/chatMap.ts`: 25
- `provider-app/src/utils/dates.ts`: 3, 6

### admin: 36 hits in 25 files

- `admin/src/components/AlertsBell.tsx`: 38, 47
- `admin/src/components/MedicineQuickEdit.tsx`: 203
- `admin/src/components/ProviderFullDetail.tsx`: 616, 618
- `admin/src/pages/admin/alerts.tsx`: 25, 26
- `admin/src/pages/admin/approvals.tsx`: 84, 103
- `admin/src/pages/admin/audit-logs.tsx`: 92
- `admin/src/pages/admin/broadcast-monitor.tsx`: 26
- `admin/src/pages/admin/command-center.tsx`: 37, 48
- `admin/src/pages/admin/crm.tsx`: 17, 18
- `admin/src/pages/admin/disputes.tsx`: 68
- `admin/src/pages/admin/gdpr.tsx`: 27
- `admin/src/pages/admin/home-curation.tsx`: 19
- `admin/src/pages/admin/impersonation.tsx`: 22
- `admin/src/pages/admin/orders/[kind]/[id].tsx`: 73
- `admin/src/pages/admin/orders/index.tsx`: 61, 72, 73
- `admin/src/pages/admin/pharmacy-price-review.tsx`: 130
- `admin/src/pages/admin/price-override-audit.tsx`: 103
- `admin/src/pages/admin/price-reviews.tsx`: 19
- `admin/src/pages/admin/provider-audits.tsx`: 105
- `admin/src/pages/admin/scheduled-reports.tsx`: 26, 32
- `admin/src/pages/admin/service-proposals.tsx`: 121
- `admin/src/pages/admin/today.tsx`: 38, 90
- `admin/src/pages/admin/web-vitals.tsx`: 58
- `admin/src/utils/app-logs-i18n.ts`: 12
- `admin/src/utils/dates.ts`: 24, 26

## P4 Map default centre (Riyadh coordinates)

Pattern: `24\.7136\|46\.6753`

### patient-app: 3 hits in 3 files

- `patient-app/src/components/account/LocationPickerView.tsx`: 35
- `patient-app/src/components/account/ProvidersMapView.tsx`: 40
- `patient-app/src/components/map-explorer.ts`: 18

### patient-web: 3 hits in 2 files

- `patient-web/lib/geo/map.ts`: 7, 49
- `patient-web/lib/map/explorer-model.ts`: 11

### provider-app: 6 hits in 4 files

- `provider-app/src/components/LocationPickerModal.tsx`: 16
- `provider-app/src/screens/doctor/DoctorRegistration.tsx`: 969
- `provider-app/src/screens/pharmacy/PharmacyRegistration.tsx`: 464, 466, 468
- `provider-app/src/screens/shared/shared/ProviderProfileEditor.tsx`: 242

### admin: 0 hits in 0 files


## P5 Saudi city and region literals

Pattern: `['\"](الرياض\|جدة\|الدمام\|مكة المكرمة\|المدينة المنورة)['\"]\|id: ?'riyadh'`

### patient-app: 1 hits in 1 files

- `patient-app/src/constants/index.ts`: 87

### patient-web: 0 hits in 0 files


### provider-app: 6 hits in 2 files

- `provider-app/src/constants/index.ts`: 152, 153, 154, 155, 156
- `provider-app/src/screens/shared/shared/MedicalJobsScreen.tsx`: 354

### admin: 0 hits in 0 files


## P6 Authority, tax and law wording (SCFHS, SFDA, MOH, ZATCA, PDPL, VAT)

Pattern: `SCFHS\|SFDA\|\bMOH\b\|moh_license\|ZATCA\|PDPL\|\bVAT\b\|vat_percent`

### patient-app: 10 hits in 6 files

- `patient-app/app/consultations/doctor/[id].tsx`: 85, 88
- `patient-app/src/components/consult/Differentiators.tsx`: 52
- `patient-app/src/components/receipt/ReceiptPaper.tsx`: 17
- `patient-app/src/utils/differentiators.ts`: 7, 82
- `patient-app/src/utils/ordering.ts`: 30
- `patient-app/src/utils/receipt.ts`: 3, 80, 119

### patient-web: 27 hits in 16 files

- `patient-web/app/.well-known/agent-card.json/route.ts`: 43
- `patient-web/app/.well-known/agent-skills/index.json/route.ts`: 13
- `patient-web/app/.well-known/ai-catalog.json/route.ts`: 155, 160, 161
- `patient-web/app/[locale]/settings/privacy/page.tsx`: 37
- `patient-web/app/agent-skills/booking/skill.md/route.ts`: 11
- `patient-web/app/agent-skills/ordering/skill.md/route.ts`: 6, 9, 11, 16
- `patient-web/app/api/agent-markdown/route.ts`: 17
- `patient-web/app/api/privacy/data-export/route.ts`: 9
- `patient-web/components-next/consult/differentiators.tsx`: 9
- `patient-web/components-next/receipt/receipt-paper.tsx`: 16, 21, 25
- `patient-web/components-next/settings/data-rights.tsx`: 11, 51
- `patient-web/lib/api/doctors.ts`: 31, 57
- `patient-web/lib/ordering/quote.ts`: 24
- `patient-web/lib/receipt/labels.ts`: 16
- `patient-web/lib/receipt/model.ts`: 14, 21, 54
- `patient-web/lib/receipt/tlv.ts`: 1

### provider-app: 21 hits in 11 files

- `provider-app/src/screens/auth/AuthScreens.tsx`: 284
- `provider-app/src/screens/doctor/DoctorRegistration.tsx`: 39
- `provider-app/src/screens/doctor/doctorRegistrationFields.ts`: 7
- `provider-app/src/screens/facility/FacilityRegistration.tsx`: 340
- `provider-app/src/screens/facility/facility/CredentialingScreen.tsx`: 96
- `provider-app/src/screens/lab/LabRegistration.tsx`: 43, 176, 187
- `provider-app/src/screens/nursing/NursingRegistration.tsx`: 135, 145, 150, 400
- `provider-app/src/screens/pharmacy/PharmacyRegistration.tsx`: 138, 150, 151, 158
- `provider-app/src/screens/shared/blueprint/PharmacyBroadcastResponse.tsx`: 209
- `provider-app/src/screens/shared/shared/CertificatesConfigScreen.tsx`: 42, 43, 47
- `provider-app/src/utils/ledgerLabels.ts`: 14

### admin: 18 hits in 7 files

- `admin/src/components/ProviderFullDetail.tsx`: 114, 368, 507
- `admin/src/pages/admin/finance-suite.tsx`: 10, 34, 38, 41, 57, 66, 69
- `admin/src/pages/admin/financial-ledger.tsx`: 174, 200
- `admin/src/pages/admin/pharmacy-price-review.tsx`: 16, 89
- `admin/src/pages/admin/price-override-audit.tsx`: 45
- `admin/src/pages/admin/price-reviews.tsx`: 22, 91
- `admin/src/pages/admin/provider-moderation.tsx`: 75

## P7 National ID / iqama format and fields

Pattern: `\[12\]\\\\d\{9\}\|[Ii]qama\|national_?[iI]d\|NationalId`

### patient-app: 42 hits in 11 files

- `patient-app/app/insurance/add-policy.tsx`: 109, 150
- `patient-app/app/medical-reports/[id].tsx`: 11, 98, 100, 101
- `patient-app/src/components/BookingConfirmForm.tsx`: 10, 11, 81, 84, 89, 90, 277
- `patient-app/src/components/consult/NationalIdForm.tsx`: 8, 11, 15, 24, 26, 32, 38, 44, 48, 49, 50, 52
- `patient-app/src/components/insurance/InsuranceHubView.tsx`: 130
- `patient-app/src/components/insurance/InsuranceKit.tsx`: 45
- `patient-app/src/services/Logger.ts`: 27
- `patient-app/src/types/index.ts`: 13
- `patient-app/src/utils/insurance-chi-contract.ts`: 31
- `patient-app/src/utils/medicalReport.ts`: 34, 35, 51, 85
- `patient-app/src/utils/nationalId.ts`: 2, 3, 4, 5, 12, 13, 29, 32

### patient-web: 37 hits in 10 files

- `patient-web/app/[locale]/insurance/page.tsx`: 173
- `patient-web/app/[locale]/medical-reports/[reportId]/page.tsx`: 12, 74, 76, 77
- `patient-web/app/api/insurance/ocr-extract/route.ts`: 15
- `patient-web/components-next/booking-flow.tsx`: 14, 15, 99, 101, 105, 106, 320
- `patient-web/components-next/insurance/add-policy-form.tsx`: 114
- `patient-web/components-next/medical-reports/national-id-form.tsx`: 7, 11, 14, 18, 27, 31
- `patient-web/lib/api/insurance.ts`: 3, 5, 6
- `patient-web/lib/api/patient-allowlist.ts`: 151
- `patient-web/lib/medical-reports/national-id.ts`: 2, 3, 4, 5, 7, 12, 13, 29, 32
- `patient-web/lib/medical-reports/rest.ts`: 41, 42, 58, 89

### provider-app: 12 hits in 4 files

- `provider-app/src/screens/doctor/DoctorRegistration.tsx`: 38, 67, 154, 353, 390
- `provider-app/src/screens/doctor/doctor/DoctorHomeTab.tsx`: 137, 331
- `provider-app/src/screens/nursing/NursingRegistration.tsx`: 53, 77, 397, 430
- `provider-app/src/screens/shared/shared/CertificatesConfigScreen.tsx`: 40

### admin: 2 hits in 1 files

- `admin/src/components/ProviderFullDetail.tsx`: 129, 364

## P8 Emergency number defaults

Pattern: `['\"]997['\"]\|['\"]937['\"]`

### patient-app: 2 hits in 2 files

- `patient-app/app/consultations/chat-with-doctor.tsx`: 334
- `patient-app/src/components/consult/chatPermissions.ts`: 22

### patient-web: 3 hits in 3 files

- `patient-web/app/[locale]/chat/[threadId]/page.tsx`: 81
- `patient-web/components-next/emergency/call-link.tsx`: 5
- `patient-web/lib/chat/permissions.ts`: 22

### provider-app: 1 hits in 1 files

- `provider-app/src/screens/doctor/doctor/consultationThread.ts`: 23

### admin: 0 hits in 0 files


## P9 Brand domains, deep links and store identifiers

Pattern: `nabd\.plus\|nabdplus\|com\.patient\.nabd`

### patient-app: 36 hits in 16 files

- `patient-app/.detoxrc.js`: 15, 16, 20, 21
- `patient-app/app/+native-intent.tsx`: 3
- `patient-app/app/consultations/chat-link.tsx`: 12
- `patient-app/app/consultations/video-call.tsx`: 99
- `patient-app/app/room/[id].tsx`: 55
- `patient-app/src/constants/index.ts`: 8, 9
- `patient-app/src/core/config/ConfigManager.ts`: 79, 80, 81, 82
- `patient-app/src/hooks/useSocialLogin.ts`: 65, 119
- `patient-app/src/navigation/DeepLinking.ts`: 9, 18, 20, 21
- `patient-app/src/navigation/webLinkMap.ts`: 4, 15, 128, 164
- `patient-app/src/utils/callkeep.ts`: 46
- `patient-app/src/utils/maternityWeek.ts`: 13
- `patient-app/src/utils/optimizedImage.ts`: 6, 9
- `patient-app/src/utils/pharmacyCheckout.ts`: 315, 318
- `patient-app/src/utils/receipt.ts`: 181
- `patient-app/src/utils/socialRedirects.ts`: 2, 3, 5, 7, 8

### patient-web: 88 hits in 44 files

- `patient-web/app/.well-known/acp.json/route.ts`: 14
- `patient-web/app/.well-known/agent-card.json/route.ts`: 3, 4, 40, 47, 54
- `patient-web/app/.well-known/agent-skills/index.json/route.ts`: 3
- `patient-web/app/.well-known/ai-catalog.json/route.ts`: 3, 4, 5, 11, 15, 16, 31, 32, 46, 47, 62, 63, 77, 78, 92, 93, 107, 108, 122, 123, 138, 139, 153, 154
- `patient-web/app/.well-known/api-catalog/route.ts`: 3, 4
- `patient-web/app/.well-known/apple-app-site-association/route.ts`: 14
- `patient-web/app/.well-known/assetlinks.json/route.ts`: 7
- `patient-web/app/.well-known/indexnow-key.txt/route.ts`: 6
- `patient-web/app/.well-known/mcp/server-card.json/route.ts`: 10, 11
- `patient-web/app/.well-known/openapi.json/route.ts`: 12
- `patient-web/app/.well-known/ucp/route.ts`: 3, 4
- `patient-web/app/[locale]/articles/articles-view.tsx`: 36
- `patient-web/app/[locale]/consultations/share-report/page.tsx`: 39
- `patient-web/app/[locale]/diagnostics/labs/page.tsx`: 22
- `patient-web/app/[locale]/doctors/[specialty]/[city]/[neighborhood]/page.tsx`: 25
- `patient-web/app/[locale]/doctors/[specialty]/[city]/page.tsx`: 25
- `patient-web/app/[locale]/home-nursing/[citySlug]/page.tsx`: 15
- `patient-web/app/[locale]/labs/page.tsx`: 22
- `patient-web/app/[locale]/layout.tsx`: 54, 62, 85, 126, 128
- `patient-web/app/[locale]/login/app-callback/page.tsx`: 20
- `patient-web/app/[locale]/nursing/catalog/page.tsx`: 48
- `patient-web/app/[locale]/p/[slug]/page.tsx`: 157
- `patient-web/app/agent-skills/booking/skill.md/route.ts`: 18
- `patient-web/app/agent-skills/ordering/skill.md/route.ts`: 19, 23
- `patient-web/app/agent-skills/public-content/skill.md/route.ts`: 15, 16
- `patient-web/app/api/agent-markdown/route.ts`: 5
- `patient-web/app/auth.md/route.ts`: 7, 8
- `patient-web/app/feeds/google-merchant/[locale]/route.ts`: 12
- `patient-web/app/indexnow-key.txt/route.ts`: 6
- `patient-web/app/llms.txt/route.ts`: 3, 4, 5
- `patient-web/app/robots.txt/route.ts`: 19
- `patient-web/components-next/web-vitals-reporter.tsx`: 14
- `patient-web/lib/api/catalog-lookup.ts`: 3
- `patient-web/lib/api/public-products-server.ts`: 109
- `patient-web/lib/auth/app-callback.ts`: 4, 7
- `patient-web/lib/consult/livekit-url.ts`: 4, 8
- `patient-web/lib/image-hosts.ts`: 2
- `patient-web/lib/llms-full.ts`: 8
- `patient-web/lib/security/csp.ts`: 75, 77
- `patient-web/lib/seo.ts`: 4
- `patient-web/lib/seo/json-ld.ts`: 2, 12, 40
- `patient-web/lib/sitemap.ts`: 18
- `patient-web/next.config.ts`: 204
- `patient-web/proxy.ts`: 21

### provider-app: 5 hits in 4 files

- `provider-app/App.tsx`: 56
- `provider-app/src/constants/index.ts`: 236, 239
- `provider-app/src/screens/shared/VideoCallRoom.tsx`: 150
- `provider-app/src/utils/imageUrl.ts`: 13

### admin: 2 hits in 1 files

- `admin/src/pages/admin/pregnancy-weeks.tsx`: 16, 138

## P10 Payment gateway and methods (Moyasar, mada, Apple Pay)

Pattern: `[Mm]oyasar\|\bmada\b\|apple_pay\|Apple Pay\|\bSTC ?Pay`

### patient-app: 17 hits in 9 files

- `patient-app/app/diagnostics/booking-status.tsx`: 231
- `patient-app/app/diagnostics/confirm.tsx`: 166
- `patient-app/app/diagnostics/insurance-approval.tsx`: 123
- `patient-app/app/insurance/copay.tsx`: 60
- `patient-app/app/nursing/nurse-profile.tsx`: 190
- `patient-app/src/constants/index.ts`: 61, 63
- `patient-app/src/core/platform/payment/PaymentProvider.ts`: 24
- `patient-app/src/types/index.ts`: 435, 446
- `patient-app/src/utils/pharmacyCheckout.ts`: 314, 318, 352, 373, 379, 384, 403

### patient-web: 9 hits in 9 files

- `patient-web/app/.well-known/acp.json/route.ts`: 26
- `patient-web/app/agent-skills/booking/skill.md/route.ts`: 14
- `patient-web/app/auth.md/route.ts`: 17
- `patient-web/app/llms.txt/route.ts`: 19
- `patient-web/components-next/consultation-payment-action.tsx`: 18
- `patient-web/components-next/home-care-booking-form.tsx`: 71
- `patient-web/components-next/nursing/nursing-pay.tsx`: 10
- `patient-web/components-next/ordering/confirm-client.tsx`: 103
- `patient-web/csp.ts`: 58

### provider-app: 0 hits in 0 files


### admin: 1 hits in 1 files

- `admin/src/pages/admin/finance-suite.tsx`: 70

