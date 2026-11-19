# Data classification (Phase 1, read-only)

Evidence: every row = `file:line` of the `@Schema(` decorator in `backend/src` (209 schemas, found by `grep -rn "@Schema("`). Classes: **Global** (one copy worldwide), **Market** (reference/config per market), **Concept+Registration** (global concept, per-market registration/price/rules), **Operator** (legal entity: money, tax, commissions), **Provider**, **Regional** (health/personal; may have to live in an in-country cell), **Snapshot** (order/transaction record; frozen copy of market/tax/price at the time).

> Method: first pass by name rules (script, not hand-checked line by line), then overrides. Columns M/G/I = money / geo / identity field names the scan found at class level (names only, not exhaustive: nested sub-documents such as `Order.totals` are not expanded). Rows marked `?` are best guesses; Phase 2 owners confirm. Two schemas share a class or collection name (see §Findings).

## What each class needs per market

| class | must become |
|---|---|
| Global | nothing (stay one global set); no PII |
| Market (reference/config) | `market_id` (or jurisdiction) on every row; unique indexes prefixed by it |
| Global concept + Market registration | split: global concept row + per-market registration (code, approval no., price rules, active) |
| Operator (legal entity) / finance | `operator_id`, `market_id`, `currency`; per-currency ledger |
| Snapshot (transaction) | `market_id`, `operator_id`, `{amount_minor,currency}`, tax + MarketConfig version snapshot; immutable |
| Provider | `jurisdiction`-scoped licences; provider belongs to one market/operator (+ branches in jurisdictions) |
| Regional (health / personal) | `home_region` / data-plane cell; no cross-cell join; encrypted fields stay in cell |

## Table

| # | schema (file:line) | collection | class | money fields | geo fields | identity fields |
|---|---|---|---|---|---|---|
| 1 | `modules/feature-flags/feature-flag.schema.ts:7` FeatureFlag | feature_flags | Global |  |  |  |
| 2 | `modules/bans/bans.schema.ts:7` Ban | (default: pluralised class) | Global |  |  |  |
| 3 | `modules/home-care/schemas/medical-supply-request.schema.ts:6` MedicalSupplyRequest | (default: pluralised class) | Snapshot (transaction) |  |  | item_name |
| 4 | `modules/admin/authority/admin-authority.module.ts:21` AdminActionLog | admin_actions_log | Global |  |  |  |
| 5 | `modules/admin/notification-center/admin-notification-center.module.ts:34` Campaign | (default: pluralised class) | Global? |  |  |  |
| 6 | `modules/admin/web-core/schemas/procurement-request.schema.ts:6` ProcurementRequest | (default: pluralised class) | Operator (legal entity) / finance? | total_warehouse_quotation_price |  |  |
| 7 | `modules/admin/web-core/schemas/system-config-extended.schema.ts:6` SystemConfigExtended | (default: pluralised class) | Global |  |  |  |
| 8 | `modules/admin/web-core/schemas/provider.schema.ts:6` Provider | (default: pluralised class) | Provider? |  |  | name, nationalId, mohLicense, medicalLicense |
| 9 | `modules/admin/web-core/schemas/audit-log.schema.ts:7` AuditLog | (default: pluralised class) | Global |  |  |  |
| 10 | `modules/admin/web-core/schemas/provider-delta.schema.ts:6` ProviderDelta | (default: pluralised class) | Provider |  |  |  |
| 11 | `modules/admin/web-core/schemas/heatmap-data.schema.ts:6` HeatmapData | (default: pluralised class) | Global |  | latitude |  |
| 12 | `modules/admin/web-core/schemas/fraud-alert.schema.ts:6` FraudAlert | (default: pluralised class) | Global? |  |  | entityName |
| 13 | `modules/admin/web-core/schemas/commission-ledger.schema.ts:6` CommissionLedger | (default: pluralised class) | Operator (legal entity) / finance | systemCommission, vatOnCommission |  | providerName |
| 14 | `modules/provider/schemas/index.ts:9` ProviderAccount | provider_accounts | Provider |  |  |  |
| 15 | `modules/provider/schemas/index.ts:41` ProviderSession | provider_sessions | Provider |  |  |  |
| 16 | `modules/provider/schemas/index.ts:54` ProviderProfile | provider_profiles | Provider |  |  |  |
| 17 | `modules/provider/schemas/index.ts:99` ProviderDocument | provider_documents | Provider |  |  |  |
| 18 | `modules/provider/schemas/index.ts:134` ProviderBankAccount | provider_bank_accounts | Provider |  |  |  |
| 19 | `modules/provider/schemas/index.ts:153` ProviderOperator | provider_operators | Provider |  |  |  |
| 20 | `modules/provider/schemas/index.ts:178` ProviderOtpCode | provider_otp_codes | Provider |  |  |  |
| 21 | `modules/provider/schemas/index.ts:198` ProviderAuditLog | provider_audit_logs | Provider |  |  |  |
| 22 | `modules/provider/schemas/index.ts:219` ProviderDelta | provider_deltas | Provider |  |  |  |
| 23 | `modules/provider/schemas/capabilities.schema.ts:8` PharmacyInventoryItem | provider_capabilities_pharmacy | Provider |  |  |  |
| 24 | `modules/provider/schemas/capabilities.schema.ts:42` LabTestCatalogItem | provider_capabilities_lab | Provider |  |  |  |
| 25 | `modules/provider/schemas/capabilities.schema.ts:61` RadiologyServiceCatalogItem | provider_capabilities_radiology | Global concept + Market registration |  |  |  |
| 26 | `modules/provider/schemas/capabilities.schema.ts:79` DoctorSessionType | provider_capabilities_doctor_sessions | Provider |  |  |  |
| 27 | `modules/provider/schemas/capabilities.schema.ts:95` HomeCareServiceCatalogItem | provider_capabilities_home_care | Global concept + Market registration |  |  |  |
| 28 | `modules/provider/schemas/capabilities.schema.ts:113` ProviderDeliveryZone | provider_delivery_zones | Provider |  |  |  |
| 29 | `modules/provider/schemas/capabilities.schema.ts:131` ProviderScheduleSlot | provider_schedule_slots | Provider |  |  |  |
| 30 | `modules/provider/schemas/capabilities.schema.ts:163` ProviderAssignmentAttempt | provider_assignment_attempts | Provider |  |  |  |
| 31 | `modules/provider/schemas/capabilities.schema.ts:183` ProviderScoreSnapshot | provider_scores | Provider |  |  |  |
| 32 | `modules/provider/schemas/provider-delta.schema.ts:10` ProviderDelta | (default: pluralised class) | Provider |  |  |  |
| 33 | `modules/provider/schemas/requests.schema.ts:35` ProviderRequest | provider_requests | Provider | avatar_url |  | name, phone, gender |
| 34 | `modules/provider/schemas/requests.schema.ts:121` ProviderNotification | provider_notifications | Provider |  |  |  |
| 35 | `modules/provider/schemas/requests.schema.ts:147` ProviderAvailability | provider_availability | Provider |  |  |  |
| 36 | `modules/provider/schemas/hospital-sub-entity.schema.ts:6` HospitalSubEntity | (default: pluralised class) | Provider |  |  |  |
| 37 | `modules/insurance-engine/insurance-engine.module.ts:82` InsuranceServiceRequest | (default: pluralised class) | Snapshot (transaction) |  |  |  |
| 38 | `modules/insurance-engine/insurance-engine.module.ts:129` RefundRequest | (default: pluralised class) | Operator (legal entity) / finance |  |  |  |
| 39 | `modules/insurance-engine/insurance-engine.module.ts:151` PlatformLedgerEntry | (default: pluralised class) | Operator (legal entity) / finance |  |  |  |
| 40 | `modules/insurance-engine/insurance-engine.module.ts:167` CommissionRule | (default: pluralised class) | Operator (legal entity) / finance |  |  |  |
| 41 | `modules/auth/schemas/trusted-device.schema.ts:14` TrustedDevice | trusted_devices | Global |  |  |  |
| 42 | `modules/auth/schemas/passkey-credential.schema.ts:8` PasskeyCredential | passkey_credentials | Global |  |  | device_name |
| 43 | `modules/radiology/schemas/radiology-booking.schema.ts:6` RadiologyBooking | (default: pluralised class) | Snapshot (transaction) |  |  | scan_name_ar, scan_name_en |
| 44 | `modules/doctors/doctors.schemas.ts:5` Doctor | doctors | Provider |  |  |  |
| 45 | `modules/doctors/doctors.schemas.ts:55` DoctorAppointment | doctor_appointments | Snapshot (transaction) |  |  |  |
| 46 | `modules/doctors/doctors.schemas.ts:79` DoctorChatMessage | doctor_chat_messages | Provider |  |  |  |
| 47 | `modules/doctors/doctors.schemas.ts:90` ConsultationNote | consultation_notes | Provider |  |  |  |
| 48 | `modules/doctors/doctors.schemas.ts:103` NotificationItem | in_app_notifications | Regional (health / personal) |  |  |  |
| 49 | `modules/search-intent/schemas/query-analytics.schema.ts:6` QueryAnalytics | query_analytics | Global |  | resolved_location_code |  |
| 50 | `modules/search-intent/schemas/search-intent.schema.ts:22` SearchIntent | search_intents | Global |  |  |  |
| 51 | `modules/event-reliability/event-reliability.module.ts:21` EventDlq | event_dlq | Global |  |  |  |
| 52 | `modules/event-reliability/event-reliability.module.ts:34` EventDelivery | event_delivery_log | Global |  |  |  |
| 53 | `modules/hospital/schemas/hospital-staff.schema.ts:6` HospitalStaff | (default: pluralised class) | Provider |  |  |  |
| 54 | `modules/hospital/schemas/hospital-department.schema.ts:6` HospitalDepartment | (default: pluralised class) | Provider | consultation_fee |  | name_ar, name_en |
| 55 | `modules/hospital/schemas/hospital-invitation.schema.ts:13` HospitalInvitation | facility_invitations | Provider |  |  |  |
| 56 | `modules/hospital/schemas/hospital-branch.schema.ts:6` HospitalBranch | (default: pluralised class) | Provider |  | city, district, coordinates | name_ar, name_en |
| 57 | `modules/media/media.schema.ts:8` MediaAsset | media_assets | Global |  |  |  |
| 58 | `modules/operations-safety/operations-safety.module.ts:24` CancellationPenalty | cancellation_penalties | Operator (legal entity) / finance |  |  |  |
| 59 | `modules/location/schemas/location.schema.ts:8` LocationCoordinates | (default: pluralised class) | Market (reference/config) |  | lat, lng |  |
| 60 | `modules/location/schemas/location.schema.ts:17` LocationCoverage | (default: pluralised class) | Market (reference/config) |  |  |  |
| 61 | `modules/location/schemas/location.schema.ts:29` Location | locations | Market (reference/config) |  | coordinates | name_ar, name_en |
| 62 | `modules/events/system-event.schema.ts:9` SystemEvent | system_events | Global |  |  |  |
| 63 | `modules/medical-programs/medical-programs.module.ts:13` MedicalProgramEnrollment | medical_program_enrollments | Global concept + Market registration |  |  |  |
| 64 | `modules/billing/billing.module.ts:38` EInvoice | (default: pluralised class) | Operator (legal entity) / finance |  |  |  |
| 65 | `modules/storage/storage.module.ts:21` StorageObject | storage_objects | Global |  |  |  |
| 66 | `modules/product-ranking/manual-boost.schema.ts:10` ManualBoost | manual_boosts | Global |  |  |  |
| 67 | `modules/cart/cart.module.ts:23` UnifiedCart | unified_carts | Snapshot (transaction) | price |  | name_ar, name_en |
| 68 | `modules/service-catalog/service-catalog.module.ts:20` ServiceOwnership | service_ownership | Global concept + Market registration |  |  |  |
| 69 | `modules/service-catalog/service-catalog.module.ts:36` ProviderOffering | provider_offerings | Provider |  |  |  |
| 70 | `modules/service-catalog/service-catalog.module.ts:49` ProviderSchedule | provider_schedules | Provider |  |  |  |
| 71 | `modules/care/schemas/doctor-profile-extended.schema.ts:6` DoctorProfileExtended | (default: pluralised class) | Provider | price_clinic, price_online, price_home | weekly_schedule_template |  |
| 72 | `modules/care/schemas/encounter-referrals.schema.ts:4` EncounterReferral | (default: pluralised class) | Snapshot (transaction) |  |  |  |
| 73 | `modules/push/push.module.ts:39` PushToken | (default: pluralised class) | Global |  |  |  |
| 74 | `modules/push/push.module.ts:60` PushLog | (default: pluralised class) | Global |  |  |  |
| 75 | `modules/push/push.module.ts:76` WebPushSubscription | (default: pluralised class) | Regional (health / personal)? |  |  |  |
| 76 | `modules/push/push.module.ts:89` PushEngagement | (default: pluralised class) | Global |  |  |  |
| 77 | `modules/entity-graph/schemas/condition.schema.ts:6` Condition | conditions | Global |  |  | name_ar, name_en |
| 78 | `modules/entity-graph/schemas/entity-relation.schema.ts:6` EntityRelation | entity_relations | Global |  | relation |  |
| 79 | `modules/labs/schemas/lab-booking.schema.ts:6` LabBooking | (default: pluralised class) | Snapshot (transaction) |  |  | patient_name, test_name_ar, test_name_en, parameter_name |
| 80 | `modules/labs/schemas/lab-catalog.schema.ts:6` LabCatalog | (default: pluralised class) | Global concept + Market registration | in_lab_price, home_collection_price |  | test_name_ar, test_name_en, parameter_name |
| 81 | `modules/pharmacy/schemas/pharmacy.schema.ts:114` PharmacyOrder | pharmacy_orders | Snapshot (transaction) | unit_price, totals, total_candidates_considered, total_score | city, geo | raw_name, name_ar, name_en, generic_name |
| 82 | `modules/pharmacy/schemas/pharmacy.schema.ts:258` PharmacyAllocation | pharmacy_allocations | Snapshot (transaction) | unit_price, totals |  | name, courier_name, courier_phone |
| 83 | `modules/pharmacy/schemas/pharmacy.schema.ts:327` PrescriptionIntake | pharmacy_prescription_intakes | Snapshot (transaction) |  |  |  |
| 84 | `modules/pharmacy/schemas/pharmacy.schema.ts:349` PharmacySubstituteMap | pharmacy_substitute_map | Global concept + Market registration |  |  |  |
| 85 | `modules/pharmacy/schemas/pharmacy.schema.ts:363` PharmacyLowStockAlert | pharmacy_low_stock_alerts | Snapshot (transaction) |  |  |  |
| 86 | `modules/pharmacy/schemas/pharmacy.schema.ts:381` PharmacyBroadcast | pharmacy_broadcasts | Snapshot (transaction) | unit_price, delivery_fee |  | pharmacy_name |
| 87 | `modules/pharmacy/schemas/pharmacy.schema.ts:426` PharmacyOffer | pharmacy_offers | Snapshot (transaction) | inventory_price_updated_at, above_catalogue_price, catalogue_price, delivery_fee_source, delivery_fee |  |  |
| 88 | `modules/pharmacy/schemas/pharmacy.schema.ts:480` PharmacyChatThread | pharmacy_chat_threads | Snapshot (transaction) |  |  |  |
| 89 | `modules/pharmacy/schemas/pharmacy.schema.ts:495` PharmacyChatMessage | pharmacy_chat_messages | Snapshot (transaction) |  |  |  |
| 90 | `modules/pharmacy/schemas/pharmacy.schema.ts:513` DrugShortageFlag | pharmacy_drug_shortage_flags | Global concept + Market registration |  |  |  |
| 91 | `modules/pharmacy/schemas/procurement-request.schema.ts:6` ProcurementRequest | (default: pluralised class) | Operator (legal entity) / finance? | total_warehouse_quotation_price |  | raw_name_string |
| 92 | `modules/moyasar/moyasar.module.ts:44` MoyasarPayment | moyasar_payments | Operator (legal entity) / finance |  |  |  |
| 93 | `modules/unified-bookings/booking-ops.module.ts:29` BookingAttachment | booking_attachments | Snapshot (transaction) |  |  |  |
| 94 | `schemas/job-board.schema.ts:5` CandidateExperience | (default: pluralised class) | Provider |  |  |  |
| 95 | `schemas/job-board.schema.ts:15` CandidateProfile | candidate_profiles | Provider |  |  |  |
| 96 | `schemas/job-board.schema.ts:31` JobPosting | job_postings | Provider |  |  |  |
| 97 | `schemas/job-board.schema.ts:60` JobApplication | job_applications | Provider |  |  |  |
| 98 | `schemas/drug-rejection-log.schema.ts:5` DrugRejectionLog | pharmacy_drug_rejection_logs | Snapshot (transaction) |  |  |  |
| 99 | `schemas/facility.schema.ts:11` Facility | facilities | Provider |  | location |  |
| 100 | `schemas/loyalty.schemas.ts:5` LoyaltyAccount | loyalty_accounts | Operator (legal entity) / finance |  |  |  |
| 101 | `schemas/loyalty.schemas.ts:16` LoyaltyTransaction | loyalty_transactions | Operator (legal entity) / finance |  |  |  |
| 102 | `schemas/loyalty.schemas.ts:34` LoyaltyChallenge | loyalty_challenges | Market (reference/config) |  |  |  |
| 103 | `schemas/loyalty.schemas.ts:51` ChallengeProgress | challenge_progress | Regional (health / personal)? |  |  |  |
| 104 | `schemas/loyalty.schemas.ts:62` Reward | loyalty_rewards | Market (reference/config) |  |  |  |
| 105 | `schemas/loyalty.schemas.ts:80` RewardClaim | reward_claims | Operator (legal entity) / finance |  |  |  |
| 106 | `schemas/outbound-referral.schema.ts:5` OutboundReferral | outbound_referrals | Snapshot (transaction) |  |  |  |
| 107 | `schemas/medicine.schema.ts:6` Medicine | medicines | Global concept + Market registration |  |  |  |
| 108 | `schemas/home-care.schema.ts:25` HomeCareService | nursing_services | Global concept + Market registration |  |  |  |
| 109 | `schemas/home-care.schema.ts:76` HomeCareBooking | (default: pluralised class) | Snapshot (transaction) |  | exact_location_confirmed |  |
| 110 | `schemas/home-care.schema.ts:209` NurseProvider | nurse_providers | Provider |  |  |  |
| 111 | `schemas/home-care.schema.ts:221` NursingVisitReport | (default: pluralised class) | Snapshot (transaction) |  |  |  |
| 112 | `schemas/home-care.schema.ts:240` CarePlan | (default: pluralised class) | Snapshot (transaction) |  |  |  |
| 113 | `schemas/home-care.schema.ts:254` HomeCarePackage | (default: pluralised class) | Snapshot (transaction) |  |  |  |
| 114 | `schemas/home-care.schema.ts:269` MedicalSupplyRequest | (default: pluralised class) | Snapshot (transaction) |  |  |  |
| 115 | `schemas/treatment-program.schema.ts:7` TreatmentProgram | treatment_programs | Global concept + Market registration |  |  |  |
| 116 | `schemas/wallet.schema.ts:8` Wallet | wallets | Operator (legal entity) / finance | balance, balance_halalas |  |  |
| 117 | `schemas/wallet.schema.ts:36` WalletTransaction | wallet_transactions | Snapshot (transaction) | amount, amount_halalas |  |  |
| 118 | `schemas/image-processing-job.schema.ts:4` ImageProcessingJob | image_processing_jobs | Global |  |  |  |
| 119 | `schemas/patient-profile.schema.ts:5` PatientProfile | patient_profiles | Regional (health / personal) |  | street, district, city, region | company_name, member_name, national_id, company_name |
| 120 | `schemas/lab-result.schema.ts:13` LabResult | (default: pluralised class) | Snapshot (transaction) |  |  |  |
| 121 | `schemas/refund-request.schema.ts:5` RefundRequest | (default: pluralised class) | Operator (legal entity) / finance |  |  |  |
| 122 | `schemas/universal-activity.schema.ts:7` UniversalActivity | universal_activities | Global |  |  |  |
| 123 | `schemas/profile-image-metadata.schema.ts:4` ProfileImageMetadata | profile_images_metadata | Global |  |  |  |
| 124 | `schemas/leave-request.schema.ts:5` LeaveRequest | (default: pluralised class) | Snapshot (transaction) |  |  |  |
| 125 | `schemas/delivery.schema.ts:6` Delivery | deliveries | Snapshot (transaction) |  |  |  |
| 126 | `schemas/nutrition.schema.ts:5` NutritionProfile | nutrition_profiles | Regional (health / personal) |  |  |  |
| 127 | `schemas/nutrition.schema.ts:32` MealLog | nutrition_meal_logs | Regional (health / personal) |  |  |  |
| 128 | `schemas/nutrition.schema.ts:57` WaterLog | nutrition_water_logs | Regional (health / personal) |  |  |  |
| 129 | `schemas/nutrition.schema.ts:68` ExerciseLog | nutrition_exercise_logs | Regional (health / personal) |  |  |  |
| 130 | `schemas/health.schema.ts:5` VitalReading | (default: pluralised class) | Regional (health / personal) |  |  |  |
| 131 | `schemas/health.schema.ts:23` MedicationReminder | (default: pluralised class) | Regional (health / personal) |  |  |  |
| 132 | `schemas/health.schema.ts:58` SleepReading | (default: pluralised class) | Regional (health / personal) |  |  |  |
| 133 | `schemas/appointment.schema.ts:51` StateLogEntry | (default: pluralised class) | Snapshot (transaction) |  |  |  |
| 134 | `schemas/appointment.schema.ts:61` Appointment | appointments | Snapshot (transaction) |  | visit_location |  |
| 135 | `schemas/inventory.schema.ts:5` PharmacyInventory | pharmacy_inventory | Provider |  |  |  |
| 136 | `schemas/prescription.schema.ts:7` PrescriptionItem | (default: pluralised class) | Regional (health / personal) |  |  |  |
| 137 | `schemas/prescription.schema.ts:32` Prescription | prescriptions | Regional (health / personal) |  |  |  |
| 138 | `schemas/patient-crm-tag.schema.ts:5` PatientCrmTag | patient_crm_tags | Regional (health / personal) | private_notes |  |  |
| 139 | `schemas/family.schemas.ts:17` FamilyGroup | family_groups | Regional (health / personal) |  |  |  |
| 140 | `schemas/family.schemas.ts:32` SharedCalendarEvent | shared_calendar_events | Regional (health / personal) |  |  |  |
| 141 | `schemas/family.schemas.ts:55` FamilyPermissionRequest | family_permission_requests | Regional (health / personal) |  |  |  |
| 142 | `schemas/sla-log.schema.ts:7` SlaLog | sla_logs | Global |  |  |  |
| 143 | `schemas/provider-profile.schema.ts:23` ProviderProfile | provider_profiles | Provider | price_clinic, price_online, price_home, price_clinic, price_online | geoPoint | license_status, gender, nationality, name |
| 144 | `schemas/returns.schema.ts:5` ReturnRequest | (default: pluralised class) | Operator (legal entity) / finance |  |  |  |
| 145 | `schemas/transaction.schema.ts:8` Transaction | (default: pluralised class) | Snapshot (transaction) |  |  |  |
| 146 | `schemas/promotion-campaign.schema.ts:7` PromotionCampaign | promotioncampaigns | Market (reference/config) | original_price, discounted_price |  |  |
| 147 | `schemas/diagnostic-order.schema.ts:10` DiagnosticOrder | diagnostic_orders | Snapshot (transaction) | price |  |  |
| 148 | `schemas/feature-flag.schema.ts:7` FeatureFlag | feature_flags | Global |  |  | flagName |
| 149 | `schemas/pregnancy-week.schema.ts:9` PregnancyWeek | pregnancy_weeks | Global |  |  |  |
| 150 | `schemas/audit-log.schema.ts:25` AuditLog | (default: pluralised class) | Global |  |  |  |
| 151 | `schemas/extra.schemas.ts:7` MedicationPlan | medication_plans | Regional (health / personal) |  |  |  |
| 152 | `schemas/extra.schemas.ts:26` MedicationDose | medication_doses | Regional (health / personal) |  |  |  |
| 153 | `schemas/extra.schemas.ts:42` Appointment | appointments | Snapshot (transaction) |  |  |  |
| 154 | `schemas/extra.schemas.ts:66` HealthRecord | health_records | Regional (health / personal) |  |  |  |
| 155 | `schemas/extra.schemas.ts:80` AIInteraction | ai_interactions | Regional (health / personal) |  |  |  |
| 156 | `schemas/approval-request.schema.ts:12` ApprovalRequest | approval_requests | Operator (legal entity) / finance |  |  |  |
| 157 | `schemas/mental-health.schema.ts:40` MoodEntry | mood_entries | Regional (health / personal) |  |  |  |
| 158 | `schemas/mental-health.schema.ts:57` MeditationSession | meditation_sessions | Regional (health / personal) |  |  |  |
| 159 | `schemas/mental-health.schema.ts:71` BreathingSession | breathing_sessions | Regional (health / personal) |  |  |  |
| 160 | `schemas/radiology.schema.ts:11` RadiologyService | radiology_services | Global concept + Market registration |  |  |  |
| 161 | `schemas/radiology.schema.ts:82` RadiologyMachine | (default: pluralised class) | Provider |  |  |  |
| 162 | `schemas/radiology.schema.ts:124` RadiologyBooking | (default: pluralised class) | Snapshot (transaction) |  |  |  |
| 163 | `schemas/user.schema.ts:6` User | users | Regional (health / personal) |  |  |  |
| 164 | `schemas/medical-profile.schema.ts:14` MedicalProfile | (default: pluralised class) | Regional (health / personal) |  |  |  |
| 165 | `schemas/fraud-alert.schema.ts:7` FraudAlert | fraud_alerts | Global? |  |  |  |
| 166 | `schemas/custom-service.schema.ts:35` CustomServiceRequest | (default: pluralised class) | Snapshot (transaction) |  |  |  |
| 167 | `schemas/ai-content-review.schema.ts:19` AiContentReviewItem | ai_content_review_queue | Global |  |  |  |
| 168 | `schemas/article.schema.ts:8` Article | (default: pluralised class) | Market (reference/config)? |  |  |  |
| 169 | `schemas/medical-report.schema.ts:23` MedicalReport | (default: pluralised class) | Regional (health / personal) |  |  |  |
| 170 | `schemas/ad-placement.schema.ts:7` AdPlacement | ad_placements | Global | bidAmount |  |  |
| 171 | `schemas/support.schema.ts:21` SupportRequest | (default: pluralised class) | Regional (health / personal) |  |  |  |
| 172 | `schemas/support.schema.ts:46` PatientSettings | (default: pluralised class) | Regional (health / personal) |  |  |  |
| 173 | `schemas/maternity.schema.ts:6` Checkup | (default: pluralised class) | Regional (health / personal) |  |  | name |
| 174 | `schemas/maternity.schema.ts:20` KickLog | (default: pluralised class) | Regional (health / personal) |  |  |  |
| 175 | `schemas/maternity.schema.ts:36` ContractionLog | (default: pluralised class) | Regional (health / personal) |  |  |  |
| 176 | `schemas/maternity.schema.ts:52` InfantGrowthLog | (default: pluralised class) | Regional (health / personal) |  |  |  |
| 177 | `schemas/maternity.schema.ts:74` MaternityProfile | (default: pluralised class) | Regional (health / personal) |  |  |  |
| 178 | `schemas/order.schema.ts:8` OrderResult | (default: pluralised class) | Snapshot (transaction) |  |  |  |
| 179 | `schemas/order.schema.ts:18` OrderItem | (default: pluralised class) | Snapshot (transaction) |  |  |  |
| 180 | `schemas/order.schema.ts:37` StateTransition | (default: pluralised class) | Snapshot (transaction) |  |  |  |
| 181 | `schemas/order.schema.ts:48` Order | orders | Snapshot (transaction) |  | delivery_address |  |
| 182 | `schemas/order.schema.ts:135` PharmacyBid | pharmacy_bids | Snapshot (transaction) | price |  | name_ar, alternative_name |
| 183 | `schemas/lab.schema.ts:8` LabService | lab_services | Global concept + Market registration |  |  |  |
| 184 | `schemas/lab.schema.ts:98` LabBooking | (default: pluralised class) | Snapshot (transaction) |  |  |  |
| 185 | `schemas/lab.schema.ts:180` LabSample | lab_samples | Snapshot (transaction) |  |  |  |
| 186 | `schemas/insurance.schema.ts:7` InsuranceNetworkContract | (default: pluralised class) | Market (reference/config) |  |  |  |
| 187 | `schemas/insurance.schema.ts:22` InsuranceCompany | insurance_companies | Market (reference/config) |  |  |  |
| 188 | `schemas/insurance.schema.ts:48` InsuranceNetwork | insurance_networks | Market (reference/config) |  |  |  |
| 189 | `schemas/insurance.schema.ts:71` CoverageRule | insurance_coverage_rules | Market (reference/config) |  |  |  |
| 190 | `schemas/insurance.schema.ts:86` InsuranceClaim | insurance_claims | Operator (legal entity) / finance |  |  |  |
| 191 | `schemas/insurance.schema.ts:117` InsuranceDetails | (default: pluralised class) | Regional (health / personal)? |  |  |  |
| 192 | `schemas/corporate-account.schema.ts:7` CorporateAccount | corporate_accounts | Market (reference/config) |  |  | companyName |
| 193 | `schemas/referral.schema.ts:7` ReferralCode | referral_codes | Market (reference/config) |  |  |  |
| 194 | `schemas/referral.schema.ts:26` ReferralReward | referral_rewards | Operator (legal entity) / finance? | amount |  |  |
| 195 | `schemas/notification.schema.ts:6` Notification | notifications | Regional (health / personal)? |  |  |  |
| 196 | `schemas/notification-template.schema.ts:8` NotificationTemplate | notification_templates | Global |  |  |  |
| 197 | `schemas/product-ranking-metrics.schema.ts:7` ProductRankingMetrics | product_ranking_metrics | Global | conversion_rate |  |  |
| 198 | `schemas/system-config.schema.ts:5` SystemConfig | system_configs | Global |  |  |  |
| 199 | `schemas/review.schema.ts:4` Review | (default: pluralised class) | Provider? |  |  |  |
| 200 | `schemas/profile-image-audit-log.schema.ts:4` ProfileImageAuditLog | profile_image_audit_logs | Global |  |  |  |
| 201 | `schemas/provider-branch.schema.ts:7` ProviderBranch | provider_branches | Provider |  | city, district, location | branch_name_ar, branch_name_en |
| 202 | `schemas/b2b-request.schema.ts:5` B2BRequest | b2b_requests | Operator (legal entity) / finance |  |  |  |
| 203 | `schemas/slot-lock.schema.ts:7` SlotLock | (default: pluralised class) | Snapshot (transaction) |  |  |  |
| 204 | `schemas/hospital-operations.schema.ts:7` Ward | facility_wards | Provider |  |  |  |
| 205 | `schemas/hospital-operations.schema.ts:18` Bed | facility_beds | Provider |  |  |  |
| 206 | `schemas/hospital-operations.schema.ts:30` Admission | facility_admissions | Provider |  |  |  |
| 207 | `schemas/hospital-operations.schema.ts:46` Shift | staff_shifts | Provider |  |  |  |
| 208 | `schemas/hospital-operations.schema.ts:60` Attendance | staff_attendance | Provider |  |  |  |
| 209 | `schemas/hospital-operations.schema.ts:76` SurgeryBooking | surgery_bookings | Snapshot (transaction) |  |  |  |

## Findings
- Duplicate definitions: `ProviderProfile` (`schemas/provider-profile.schema.ts:23` and `modules/provider/schemas/index.ts:54`, both `provider_profiles`), `Appointment` (`schemas/appointment.schema.ts:61` and `schemas/extra.schemas.ts:42`, both `appointments`), `FeatureFlag` (`modules/feature-flags/feature-flag.schema.ts:7` and `schemas/feature-flag.schema.ts:7`), `AuditLog`, `RefundRequest`, `ProcurementRequest`, `ProviderDelta`, `LabBooking`, `RadiologyBooking`. A market key must be added in ONE place per collection first: dedupe is a prerequisite (Phase 3 step).
- Money fields exist as doubles and integer `*_halalas` side by side (`schemas/wallet.schema.ts:8,36`; R11 P3 must finish first, `docs/platform/R11-halala-p3-plan.md`). Currency is a field only on a few schemas (`modules/provider/schemas/capabilities.schema.ts:28`, `requests.schema.ts:74`, `modules/billing/billing.module.ts:49`, all `default: 'SAR'`); most money fields have no currency at all.
- Geo: `locations` is already a tree (`country|region|city|district|sub_area`, `modules/location/schemas/location.schema.ts:6,44`): a good base for a market-scoped geography; `patient_profiles` (street/district/city/region), `provider_branches` (city/district/location), `HospitalBranch`, `pharmacy_orders` (city, geo) and `orders.delivery_address` hold free address text instead of an address template.
- Identity: `national_id` / `iqama` / `mohLicense` / `medicalLicense` / `scfhs_license_number` are named columns on provider and patient records (`schemas/patient-profile.schema.ts:5`, `modules/admin/web-core/schemas/provider.schema.ts:6`, `schemas/provider-profile.schema.ts:23`), not rows in a typed identifier/licence list.
- No collection has `country_code` / `market_id` today (grep `country_code|market_id` in `backend/src`: only `provider-profile.service.ts:127` and `modules/provider/schemas/index.ts`, where it is a phone dial code, not a market; geo hint `resolved_location_code` on `query_analytics`, `modules/search-intent/schemas/query-analytics.schema.ts:6`).
