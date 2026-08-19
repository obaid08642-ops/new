# منصة نبض — Phase 15: فحص migrations والفهارس قبل النشر

**التاريخ:** 2026-08-19T14:06:34.523Z  
**النطاق:** تحليل مصدر Backend فقط. لا اتصال بقاعدة بيانات، ولا إنشاء/حذف/إعادة بناء فهرس، ولا migration تشغيلية.

## النتيجة

| البند | الملاحظة | الحالة |
|---|---|---|
| مجلدات migration المرصودة | لا يوجد مجلد migration تقليدي مرصود | BLOCKED for runtime proof |
| scripts متعلقة بالـmigration/index/seed | لا توجد scripts مرصودة | BLOCKED for runtime proof |
| أسطر schema ذات صلة بالفهرسة | 301 | INVENTORIED |
| أسطر property index المحتملة للتكرار | 246 | REVIEW REQUIRED |

## قائمة الفهارس/المؤشرات المصدرية

| الملف | السطر | التعبير |
|---|---:|---|
| `src/schemas/ad-placement.schema.ts` | 12 | `@Prop({ required: true, index: true })` |
| `src/schemas/ad-placement.schema.ts` | 24 | `@Prop({ required: true, enum: ['active', 'paused'], default: 'active', index: true })` |
| `src/schemas/ambulance-vehicle.schema.ts` | 14 | `@Prop({ required: true, index: true }) provider_account_id: string;` |
| `src/schemas/ambulance-vehicle.schema.ts` | 22 | `@Prop({ type: String, enum: ['BLS', 'ALS', 'ICU'], default: 'BLS', index: true }) vehicle_type: string;` |
| `src/schemas/ambulance-vehicle.schema.ts` | 29 | `@Prop({ type: String, enum: ['pending', 'approved', 'rejected', 'suspended'], default: 'pending', index: true })` |
| `src/schemas/analytics-event.schema.ts` | 8 | `@Prop({ index: true }) user_id?: string;` |
| `src/schemas/analytics-event.schema.ts` | 9 | `@Prop({ required: true, index: true }) event_type: string; // search, click, page_view, add_to_cart, booking_attempt` |
| `src/schemas/analytics-event.schema.ts` | 10 | `@Prop({ required: true, index: true }) domain: string; // doctor, pharmacy, lab, radiology, nursing, global` |
| `src/schemas/analytics-event.schema.ts` | 12 | `@Prop({ index: true }) session_id?: string;` |
| `src/schemas/appointment.schema.ts` | 57 | `@Prop({ required: true, index: true }) patient_id: string;` |
| `src/schemas/appointment.schema.ts` | 58 | `@Prop({ required: true, index: true }) doctor_id: string; // provider_profile.id (NOT user_id)` |
| `src/schemas/appointment.schema.ts` | 71 | `@Prop({ type: String, enum: Object.values(APPT_STATES), default: APPT_STATES.PENDING, index: true })` |
| `src/schemas/appointment.schema.ts` | 131 | `AppointmentSchema.index(` |
| `src/schemas/appointment.schema.ts` | 136 | `AppointmentSchema.index({ patient_id: 1, slot_start: -1 });` |
| `src/schemas/appointment.schema.ts` | 137 | `AppointmentSchema.index({ doctor_id: 1, status: 1, slot_start: -1 });` |
| `src/schemas/approval-request.schema.ts` | 15 | `@Prop({ required: true, index: true }) entity_type: 'medicine' | 'provider' | 'facility' | 'service';` |
| `src/schemas/approval-request.schema.ts` | 16 | `@Prop({ index: true }) entity_id?: string; // Null for creation requests; contains target UUID for modifications` |
| `src/schemas/approval-request.schema.ts` | 17 | `@Prop({ type: String, enum: Object.values(ApprovalStatus), default: ApprovalStatus.PENDING_REVIEW, index: true })` |
| `src/schemas/approval-request.schema.ts` | 19 | `@Prop({ required: true, index: true }) submitted_by: string; // user_id of provider` |
| `src/schemas/approval-request.schema.ts` | 28 | `ApprovalRequestSchema.index({ entity_type: 1, entity_id: 1, status: 1 });` |
| `src/schemas/article.schema.ts` | 18 | `@Prop({ index: true }) category?: string; // صحة عامة · أمومة وطفولة · تغذية · أمراض مزمنة · صحة نفسية` |
| `src/schemas/article.schema.ts` | 23 | `@Prop({ default: 'DRAFT', index: true }) status: string; // DRAFT | PUBLISHED` |
| `src/schemas/article.schema.ts` | 24 | `@Prop({ index: true }) published_at?: Date;` |
| `src/schemas/article.schema.ts` | 31 | `ArticleSchema.index({ status: 1, published_at: -1 });` |
| `src/schemas/audit-log.schema.ts` | 8 | `@Prop({ required: true, index: true }) action: string; // login_failed, payment_create, refund, admin_force_cancel...` |
| `src/schemas/audit-log.schema.ts` | 9 | `@Prop({ index: true }) user_id?: string;` |
| `src/schemas/audit-log.schema.ts` | 20 | `AuditLogSchema.index({ createdAt: -1 });` |
| `src/schemas/b2b-request.schema.ts` | 8 | `@Prop({ required: true, index: true }) pharmacy: string;` |
| `src/schemas/b2b-request.schema.ts` | 11 | `@Prop({ default: 'pending', index: true }) status: 'pending' | 'approved' | 'rejected';` |
| `src/schemas/callmetric.schema.ts` | 7 | `@Prop({ default: () => uuidv4(), unique: true, index: true }) id: string;` |
| `src/schemas/callmetric.schema.ts` | 8 | `@Prop({ required: true, index: true }) session_id: string;` |
| `src/schemas/callmetric.schema.ts` | 9 | `@Prop({ required: true, index: true }) participant_id: string;` |
| `src/schemas/callsession.schema.ts` | 7 | `@Prop({ default: () => uuidv4(), unique: true, index: true }) id: string;` |
| `src/schemas/callsession.schema.ts` | 8 | `@Prop({ required: true, index: true }) appointment_id: string;` |
| `src/schemas/callsession.schema.ts` | 9 | `@Prop({ required: true, index: true }) patient_id: string;` |
| `src/schemas/callsession.schema.ts` | 13 | `@Prop({ default: 'INITIATED', index: true }) status: string; // INITIATED | ACTIVE | ENDED | FAILED` |
| `src/schemas/chat-session.schema.ts` | 8 | `@Prop({ required: true, enum: ['CLINICAL', 'FAMILY'], index: true })` |
| `src/schemas/chat-session.schema.ts` | 11 | `@Prop({ type: String, ref: 'Appointment', default: null, index: true })` |
| `src/schemas/chat-session.schema.ts` | 14 | `@Prop({ type: String, ref: 'FamilyGroup', default: null, index: true })` |
| `src/schemas/chat-session.schema.ts` | 21 | `index: true` |
| `src/schemas/community.schemas.ts` | 7 | `@Prop({ required: true, unique: true, index: true }) id: string;` |
| `src/schemas/community.schemas.ts` | 8 | `@Prop({ required: true, index: true }) author_id: string;` |
| `src/schemas/community.schemas.ts` | 12 | `@Prop({ type: [String], default: [], index: true }) tags: string[];` |
| `src/schemas/community.schemas.ts` | 25 | `@Prop({ default: 'published', index: true }) status: string;` |
| `src/schemas/community.schemas.ts` | 34 | `@Prop({ required: true, unique: true, index: true }) id: string;` |
| `src/schemas/community.schemas.ts` | 35 | `@Prop({ required: true, index: true }) post_id: string;` |
| `src/schemas/community.schemas.ts` | 50 | `@Prop({ required: true, unique: true, index: true }) id: string;` |
| `src/schemas/community.schemas.ts` | 58 | `@Prop({ default: 'upcoming', index: true }) status: string;` |
| `src/schemas/corporate-account.schema.ts` | 12 | `@Prop({ required: true, unique: true, index: true })` |
| `src/schemas/custom-service.schema.ts` | 39 | `@Prop({ required: true, index: true }) patient_id: string;` |
| `src/schemas/custom-service.schema.ts` | 65 | `CustomServiceRequestSchema.index({ patient_id: 1, createdAt: -1 });` |
| `src/schemas/custom-service.schema.ts` | 66 | `CustomServiceRequestSchema.index({ status: 1, kind: 1, createdAt: -1 });` |
| `src/schemas/delivery.schema.ts` | 9 | `@Prop({ required: true, index: true }) order_id: string;` |
| `src/schemas/delivery.schema.ts` | 12 | `@Prop({ type: String, enum: Object.values(DeliveryState), default: DeliveryState.UNASSIGNED, index: true })` |
| `src/schemas/driver-shift.schema.ts` | 11 | `@Prop({ default: () => uuidv4(), unique: true, index: true }) id: string;` |
| `src/schemas/driver-shift.schema.ts` | 12 | `@Prop({ required: true, index: true }) driver_id: string;` |
| `src/schemas/drug-rejection-log.schema.ts` | 9 | `@Prop({ required: true, index: true }) medicine_id: string;` |
| `src/schemas/drug-rejection-log.schema.ts` | 10 | `@Prop({ required: true, index: true }) order_id: string;` |
| `src/schemas/drug-rejection-log.schema.ts` | 11 | `@Prop({ required: true, index: true }) pharmacy_id: string;` |
| `src/schemas/drug-rejection-log.schema.ts` | 13 | `@Prop({ required: true, enum: ['reject', 'accept'], index: true })` |
| `src/schemas/drug-rejection-log.schema.ts` | 22 | `DrugRejectionLogSchema.index({ medicine_id: 1, type: 1, timestamp: -1 });` |
| `src/schemas/emergency.schema.ts` | 9 | `@Prop({ required: true, index: true }) patient_id: string;` |
| `src/schemas/emergency.schema.ts` | 16 | `@Prop({ type: String, enum: Object.values(EmergencyState), default: EmergencyState.TRIGGERED, index: true })` |
| `src/schemas/extra.schemas.ts` | 10 | `@Prop({ required: true, index: true }) patient_id: string;` |
| `src/schemas/extra.schemas.ts` | 29 | `@Prop({ required: true, index: true }) plan_id: string;` |
| `src/schemas/extra.schemas.ts` | 30 | `@Prop({ required: true, index: true }) patient_id: string;` |
| `src/schemas/extra.schemas.ts` | 32 | `@Prop({ type: String, enum: Object.values(MedicationDoseState), default: MedicationDoseState.SCHEDULED, index: true })` |
| `src/schemas/extra.schemas.ts` | 45 | `@Prop({ required: true, index: true }) patient_id: string;` |
| `src/schemas/extra.schemas.ts` | 48 | `@Prop({ required: true, index: true }) doctor_id: string;` |
| `src/schemas/extra.schemas.ts` | 52 | `@Prop({ type: String, enum: Object.values(AppointmentStatus), default: AppointmentStatus.SCHEDULED, index: true })` |
| `src/schemas/extra.schemas.ts` | 69 | `@Prop({ required: true, index: true }) patient_id: string;` |
| `src/schemas/facility.schema.ts` | 14 | `@Prop({ index: true }) parent_facility_id?: string; // Multi-tenant parent hospital/clinic mapping` |
| `src/schemas/family.schemas.ts` | 19 | `@Prop({ required: true, unique: true, index: true }) id: string;` |
| `src/schemas/family.schemas.ts` | 20 | `@Prop({ required: true, index: true }) owner_id: string;` |
| `src/schemas/family.schemas.ts` | 24 | `@Prop({ unique: true, sparse: true, index: true }) invite_code?: string;` |
| `src/schemas/family.schemas.ts` | 34 | `@Prop({ required: true, unique: true, index: true }) id: string;` |
| `src/schemas/family.schemas.ts` | 35 | `@Prop({ required: true, index: true }) group_id: string;` |
| `src/schemas/family.schemas.ts` | 57 | `@Prop({ required: true, unique: true, index: true }) id: string;` |
| `src/schemas/family.schemas.ts` | 58 | `@Prop({ required: true, index: true }) group_id: string;` |
| `src/schemas/family.schemas.ts` | 65 | `@Prop({ default: 'pending', index: true }) status: string;` |
| `src/schemas/feature-flag.schema.ts` | 12 | `@Prop({ required: true, unique: true, index: true })` |
| `src/schemas/fraud-alert.schema.ts` | 12 | `@Prop({ required: true, index: true })` |
| `src/schemas/fraud-alert.schema.ts` | 15 | `@Prop({ required: true, index: true })` |
| `src/schemas/fraud-alert.schema.ts` | 18 | `@Prop({ required: true, enum: ['duplicate_reviews_same_ip', 'rapid_bookings'], index: true })` |
| `src/schemas/fraud-alert.schema.ts` | 24 | `@Prop({ required: true, enum: ['pending', 'flagged', 'dismissed'], default: 'pending', index: true })` |
| `src/schemas/health.schema.ts` | 8 | `@Prop({ required: true, index: true }) patient_id: string;` |
| `src/schemas/health.schema.ts` | 9 | `@Prop({ required: true, index: true }) type: string; // bp | glucose | heart_rate | weight | temperature | spo2` |
| `src/schemas/health.schema.ts` | 19 | `VitalReadingSchema.index({ patient_id: 1, type: 1, measured_at: -1 });` |
| `src/schemas/health.schema.ts` | 24 | `@Prop({ required: true, index: true }) patient_id: string;` |
| `src/schemas/health.schema.ts` | 47 | `@Prop({ index: true }) refill_pending_order_id?: string;` |
| `src/schemas/health.schema.ts` | 54 | `MedicationReminderSchema.index({ patient_id: 1, active: 1 });` |
| `src/schemas/health.schema.ts` | 59 | `@Prop({ required: true, index: true }) patient_id: string;` |
| `src/schemas/health.schema.ts` | 66 | `SleepReadingSchema.index({ patient_id: 1, measured_at: -1 });` |
| `src/schemas/home-care.schema.ts` | 31 | `@Prop({ required: true, index: true }) category: string; // nursing | physio | elderly | baby | iv | wound | injection | post_op | followup` |
| `src/schemas/home-care.schema.ts` | 55 | `@Prop({ required: true, index: true }) patient_id: string;` |
| `src/schemas/home-care.schema.ts` | 58 | `@Prop({ index: true }) service_id?: string;` |
| `src/schemas/home-care.schema.ts` | 142 | `HomeCareBookingSchema.index({ patient_id: 1, createdAt: -1 });` |
| `src/schemas/home-care.schema.ts` | 143 | `HomeCareBookingSchema.index({ state: 1, scheduled_at: 1 });` |
| `src/schemas/home-care.schema.ts` | 170 | `@Prop({ required: true, index: true }) booking_id: string;` |
| `src/schemas/home-care.schema.ts` | 188 | `@Prop({ index: true }) id: string;` |
| `src/schemas/home-care.schema.ts` | 189 | `@Prop({ required: true, index: true }) patient_id: string;` |
| `src/schemas/home-care.schema.ts` | 195 | `@Prop({ default: 'active', index: true }) status: string; // active | completed | cancelled` |
| `src/schemas/home-care.schema.ts` | 210 | `@Prop({ default: true, index: true }) active: boolean;` |
| `src/schemas/home-care.schema.ts` | 217 | `@Prop({ index: true }) id: string;` |
| `src/schemas/home-care.schema.ts` | 218 | `@Prop({ required: true, index: true }) visit_report_id: string;` |
| `src/schemas/home-care.schema.ts` | 219 | `@Prop({ required: true, index: true }) nurse_id: string;` |
| `src/schemas/home-care.schema.ts` | 225 | `@Prop({ default: 'pending', index: true }) status: string; // pending | approved | dispatched | delivered | rejected` |
| `src/schemas/hospital-operations.schema.ts` | 10 | `@Prop({ required: true, index: true }) facility_id: string;` |
| `src/schemas/hospital-operations.schema.ts` | 21 | `@Prop({ required: true, index: true }) ward_id: string;` |
| `src/schemas/hospital-operations.schema.ts` | 33 | `@Prop({ required: true, index: true }) patient_id: string;` |
| `src/schemas/hospital-operations.schema.ts` | 34 | `@Prop({ required: true, index: true }) facility_id: string;` |
| `src/schemas/hospital-operations.schema.ts` | 35 | `@Prop({ required: true, index: true }) bed_id: string;` |
| `src/schemas/hospital-operations.schema.ts` | 49 | `@Prop({ required: true, index: true }) user_id: string; // Doctor/Nurse/Staff ID` |
| `src/schemas/hospital-operations.schema.ts` | 50 | `@Prop({ required: true, index: true }) facility_id: string;` |
| `src/schemas/hospital-operations.schema.ts` | 63 | `@Prop({ required: true, index: true }) user_id: string;` |
| `src/schemas/hospital-operations.schema.ts` | 64 | `@Prop({ required: true, index: true }) facility_id: string;` |
| `src/schemas/hospital-operations.schema.ts` | 79 | `@Prop({ required: true, index: true }) facility_id: string;` |
| `src/schemas/hospital-operations.schema.ts` | 80 | `@Prop({ required: true, index: true }) patient_id: string;` |
| `src/schemas/hospital-operations.schema.ts` | 81 | `@Prop({ required: true, index: true }) primary_surgeon_id: string;` |
| `src/schemas/image-processing-job.schema.ts` | 6 | `@Prop({ required: true, index: true }) owner_id: string;` |
| `src/schemas/image-processing-job.schema.ts` | 11 | `@Prop({ required: true, enum: ['pending', 'processing', 'completed', 'failed'], default: 'pending', index: true })` |
| `src/schemas/insurance.schema.ts` | 8 | `@Prop({ required: true, index: true }) company_id: string; // FK to InsuranceCompany.id` |
| `src/schemas/insurance.schema.ts` | 11 | `@Prop({ required: true, index: true }) network_id: string; // FK to InsuranceNetwork.id` |
| `src/schemas/insurance.schema.ts` | 37 | `@Prop({ required: true, index: true }) company_id: string;` |
| `src/schemas/insurance.schema.ts` | 50 | `@Prop({ required: true, index: true }) network_id: string;` |
| `src/schemas/insurance.schema.ts` | 65 | `@Prop({ required: true, index: true }) patient_id: string;` |
| `src/schemas/insurance.schema.ts` | 80 | `@Prop({ type: String, enum: ['PENDING_PROVIDER_REVIEW', 'SUBMITTED_TO_INSURANCE', 'APPROVED', 'PARTIALLY_APPROVED', 'REJECTED'], default: 'PENDING_PROVIDER_REVIEW', index: true })` |
| `src/schemas/inventory.schema.ts` | 8 | `@Prop({ required: true, index: true }) pharmacy_id: string;` |
| `src/schemas/inventory.schema.ts` | 9 | `@Prop({ required: true, index: true }) medicine_id: string;` |
| `src/schemas/inventory.schema.ts` | 19 | `PharmacyInventorySchema.index({ pharmacy_id: 1, medicine_id: 1 }, { unique: true });` |
| `src/schemas/job-board.schema.ts` | 18 | `@Prop({ required: true, unique: true, index: true }) user_id: string; // FK to User` |
| `src/schemas/job-board.schema.ts` | 21 | `@Prop({ required: true, index: true }) scfhs_license_number: string;` |
| `src/schemas/job-board.schema.ts` | 37 | `@Prop({ required: true, index: true }) scfhs_role: string; // e.g. "GP", "Pharmacist", "Specialist Nurse"` |
| `src/schemas/job-board.schema.ts` | 40 | `@Prop({ required: true, index: true }) facility_id: string; // Owner organization` |
| `src/schemas/job-board.schema.ts` | 41 | `@Prop({ type: String, enum: ['draft', 'published', 'closed'], default: 'draft', index: true })` |
| `src/schemas/job-board.schema.ts` | 43 | `@Prop({ default: false, index: true }) is_deleted: boolean;` |
| `src/schemas/job-board.schema.ts` | 52 | `@Prop({ required: true, index: true }) job_id: string; // FK to JobPosting.id` |
| `src/schemas/job-board.schema.ts` | 53 | `@Prop({ required: true, index: true }) candidate_id: string; // FK to CandidateProfile.id or User.id` |
| `src/schemas/job-board.schema.ts` | 54 | `@Prop({ type: String, enum: ['submitted', 'under_review', 'interviewing', 'accepted', 'rejected'], default: 'submitted', index: true })` |
| `src/schemas/lab-result.schema.ts` | 17 | `@Prop({ required: true, index: true }) booking_id: string;` |
| `src/schemas/lab-result.schema.ts` | 18 | `@Prop({ required: true, index: true }) patient_id: string;` |
| `src/schemas/lab-result.schema.ts` | 25 | `@Prop({ default: 'labs', enum: ['labs', 'radiology'], index: true }) source: 'labs' | 'radiology';` |
| `src/schemas/lab-result.schema.ts` | 47 | `LabResultSchema.index({ patient_id: 1, createdAt: -1 });` |
| `src/schemas/lab-result.schema.ts` | 48 | `LabResultSchema.index({ booking_id: 1 });` |
| `src/schemas/lab.schema.ts` | 15 | `@Prop({ required: true, index: true }) category: string; // blood | hormones | diabetes | vitamins | cardiac | imaging | kidney | liver` |
| `src/schemas/lab.schema.ts` | 46 | `LabServiceSchema.index({ name_ar: 'text', name_en: 'text' });` |
| `src/schemas/lab.schema.ts` | 47 | `LabServiceSchema.index({ category: 1, popularity: -1 });` |
| `src/schemas/lab.schema.ts` | 82 | `@Prop({ required: true, index: true }) patient_id: string;` |
| `src/schemas/lab.schema.ts` | 128 | `LabBookingSchema.index({ patient_id: 1, createdAt: -1 });` |
| `src/schemas/lab.schema.ts` | 129 | `LabBookingSchema.index({ state: 1, scheduled_at: 1 });` |
| `src/schemas/lab.schema.ts` | 134 | `@Prop({ required: true, index: true }) lab_order_id: string;` |
| `src/schemas/lab.schema.ts` | 135 | `@Prop({ required: true, index: true }) patient_id: string;` |
| `src/schemas/lab.schema.ts` | 136 | `@Prop({ required: true, unique: true, index: true }) barcode: string;` |
| `src/schemas/leave-request.schema.ts` | 7 | `@Prop({ default: () => uuidv4(), unique: true, index: true }) id: string;` |
| `src/schemas/leave-request.schema.ts` | 8 | `@Prop({ required: true, index: true }) facility_id: string;` |
| `src/schemas/leave-request.schema.ts` | 9 | `@Prop({ required: true, index: true }) provider_account_id: string;` |
| `src/schemas/leave-request.schema.ts` | 16 | `@Prop({ default: 'pending', index: true, enum: ['pending', 'approved', 'rejected'] }) status: string;` |
| `src/schemas/loyalty.schemas.ts` | 7 | `@Prop({ required: true, unique: true, index: true }) user_id: string;` |
| `src/schemas/loyalty.schemas.ts` | 11 | `@Prop({ default: 'bronze', index: true }) tier: string;` |
| `src/schemas/loyalty.schemas.ts` | 18 | `@Prop({ required: true, unique: true, index: true }) id: string;` |
| `src/schemas/loyalty.schemas.ts` | 19 | `@Prop({ required: true, index: true }) user_id: string;` |
| `src/schemas/loyalty.schemas.ts` | 33 | `@Prop({ required: true, unique: true, index: true }) id: string;` |
| `src/schemas/loyalty.schemas.ts` | 50 | `@Prop({ required: true, index: true }) user_id: string;` |
| `src/schemas/loyalty.schemas.ts` | 51 | `@Prop({ required: true, index: true }) challenge_id: string;` |
| `src/schemas/loyalty.schemas.ts` | 61 | `@Prop({ required: true, unique: true, index: true }) id: string;` |
| `src/schemas/loyalty.schemas.ts` | 79 | `@Prop({ required: true, unique: true, index: true }) id: string;` |
| `src/schemas/loyalty.schemas.ts` | 80 | `@Prop({ required: true, index: true }) user_id: string;` |
| `src/schemas/loyalty.schemas.ts` | 83 | `@Prop({ default: 'pending', index: true }) status: string;` |
| `src/schemas/medical-profile.schema.ts` | 17 | `@Prop({ required: true, unique: true, index: true }) patient_id: string;` |
| `src/schemas/medical-report.schema.ts` | 26 | `@Prop({ required: true, index: true }) patient_id: string;` |
| `src/schemas/medical-report.schema.ts` | 38 | `@Prop({ index: true }) appointment_id?: string;` |
| `src/schemas/medical-report.schema.ts` | 39 | `@Prop({ index: true }) prescription_id?: string;` |
| `src/schemas/medical-report.schema.ts` | 40 | `@Prop({ index: true }) lab_booking_id?: string;` |
| `src/schemas/medical-report.schema.ts` | 41 | `@Prop({ index: true }) radiology_booking_id?: string;` |
| `src/schemas/medical-report.schema.ts` | 55 | `MedicalReportSchema.index({ patient_id: 1, createdAt: -1 });` |
| `src/schemas/medical-report.schema.ts` | 56 | `MedicalReportSchema.index({ report_type: 1, patient_id: 1 });` |
| `src/schemas/medicine.schema.ts` | 9 | `@Prop({ unique: true, sparse: true, index: true }) slug?: string;` |
| `src/schemas/medicine.schema.ts` | 14 | `@Prop({ default: 'medications', index: true }) category: string; // medications|skincare|...` |
| `src/schemas/medicine.schema.ts` | 29 | `@Prop({ index: true }) barcode?: string; // EAN13 / UPC / GTIN` |
| `src/schemas/medicine.schema.ts` | 57 | `@Prop({ default: [], index: true }) alternatives: string[]; // بدائل (medicine ids or names)` |
| `src/schemas/medicine.schema.ts` | 59 | `@Prop({ index: true }) sub_category?: string; // فئة فرعية` |
| `src/schemas/medicine.schema.ts` | 64 | `@Prop({ default: false, index: true }) online_exclusive?: boolean; // حصري أونلاين — استلام من الصيدلية فقط` |
| `src/schemas/medicine.schema.ts` | 82 | `@Prop({ default: 'none', enum: ['none', 'availability_may_be_limited', 'admin_flagged_shortage', 'discontinued'], index: true })` |
| `src/schemas/medicine.schema.ts` | 85 | `@Prop({ default: false, index: true }) is_deleted: boolean;` |
| `src/schemas/mental-health.schema.ts` | 43 | `@Prop({ required: true, index: true }) patient_id: string;` |
| `src/schemas/mental-health.schema.ts` | 55 | `MoodEntrySchema.index({ patient_id: 1, logged_at: -1 });` |
| `src/schemas/mental-health.schema.ts` | 60 | `@Prop({ required: true, index: true }) patient_id: string;` |
| `src/schemas/mental-health.schema.ts` | 69 | `MeditationSessionSchema.index({ patient_id: 1, logged_at: -1 });` |
| `src/schemas/mental-health.schema.ts` | 74 | `@Prop({ required: true, index: true }) patient_id: string;` |
| `src/schemas/mental-health.schema.ts` | 83 | `BreathingSessionSchema.index({ patient_id: 1, logged_at: -1 });` |
| `src/schemas/mental-health.schema.ts` | 88 | `@Prop({ required: true, index: true }) patient_id: string;` |
| `src/schemas/mental-health.schema.ts` | 97 | `CrisisContactSchema.index({ patient_id: 1, createdAt: -1 });` |
| `src/schemas/notification.schema.ts` | 24 | `@Prop({ default: 'PENDING', index: true }) status: string; // PENDING|SCHEDULED|SENT|PARTIAL|FAILED` |
| `src/schemas/notification.schema.ts` | 28 | `NotificationSchema.index({ user_id: 1, createdAt: -1 });` |
| `src/schemas/notification.schema.ts` | 29 | `NotificationSchema.index({ role: 1, createdAt: -1 });` |
| `src/schemas/nutrition.schema.ts` | 7 | `@Prop({ required: true, index: true }) patient_id: string;` |
| `src/schemas/nutrition.schema.ts` | 34 | `@Prop({ required: true, index: true }) patient_id: string;` |
| `src/schemas/nutrition.schema.ts` | 59 | `@Prop({ required: true, index: true }) patient_id: string;` |
| `src/schemas/nutrition.schema.ts` | 70 | `@Prop({ required: true, index: true }) patient_id: string;` |
| `src/schemas/order.schema.ts` | 50 | `@Prop({ required: true, index: true }) patient_id: string;` |
| `src/schemas/order.schema.ts` | 53 | `@Prop({ index: true }) pharmacy_id?: string; // assigned pharmacy` |
| `src/schemas/order.schema.ts` | 59 | `@Prop({ type: String, enum: Object.values(OrderState), default: OrderState.NEW, index: true })` |
| `src/schemas/order.schema.ts` | 103 | `@Prop({ type: String, enum: ['none', 'pending_pharmacy_review', 'submitted_for_patient_approval', 'patient_approved', 'patient_rejected'], default: 'none', index: true })` |
| `src/schemas/order.schema.ts` | 125 | `OrderSchema.index({ patient_id: 1, createdAt: -1 });` |
| `src/schemas/order.schema.ts` | 126 | `OrderSchema.index({ pharmacy_id: 1, state: 1 });` |
| `src/schemas/order.schema.ts` | 131 | `@Prop({ required: true, index: true }) prescription_request_id: string; // references patient order or prescription request` |
| `src/schemas/order.schema.ts` | 132 | `@Prop({ required: true, index: true }) pharmacy_id: string;` |
| `src/schemas/outbound-referral.schema.ts` | 10 | `@Prop({ required: true, index: true })` |
| `src/schemas/outbound-referral.schema.ts` | 13 | `@Prop({ required: true, index: true })` |
| `src/schemas/outbound-referral.schema.ts` | 33 | `OutboundReferralSchema.index({ referral_code: 1 }, { unique: true });` |
| `src/schemas/patient-crm-tag.schema.ts` | 10 | `@Prop({ required: true, index: true })` |
| `src/schemas/patient-crm-tag.schema.ts` | 13 | `@Prop({ required: true, index: true })` |
| `src/schemas/patient-crm-tag.schema.ts` | 36 | `PatientCrmTagSchema.index({ provider_id: 1, patient_id: 1 }, { unique: true });` |
| `src/schemas/patient-profile.schema.ts` | 8 | `@Prop({ required: true, index: true }) user_id: string;` |
| `src/schemas/pharmacy-chat.schema.ts` | 19 | `@Prop({ required: true, index: true }) order_id: string;` |
| `src/schemas/pharmacy-chat.schema.ts` | 20 | `@Prop({ required: true, index: true }) patient_id: string;` |
| `src/schemas/pharmacy-chat.schema.ts` | 21 | `@Prop({ required: true, index: true }) pharmacy_id: string;` |
| `src/schemas/pharmacy-inventory.schema.ts` | 8 | `@Prop({ required: true, index: true }) pharmacy_id: string;` |
| `src/schemas/pharmacy-inventory.schema.ts` | 9 | `@Prop({ required: true, index: true }) drug_id: string;` |
| `src/schemas/pharmacy-inventory.schema.ts` | 18 | `PharmacyInventorySchema.index({ pharmacy_id: 1, drug_id: 1 }, { unique: true });` |
| `src/schemas/prescription.schema.ts` | 27 | `@Prop({ required: true, index: true }) patient_id: string;` |
| `src/schemas/prescription.schema.ts` | 28 | `@Prop({ index: true }) doctor_id?: string; // null if uploaded by patient` |
| `src/schemas/prescription.schema.ts` | 38 | `index: true,` |
| `src/schemas/profile-image-audit-log.schema.ts` | 6 | `@Prop({ required: true, index: true }) user_id: string; // owner_id` |
| `src/schemas/profile-image-audit-log.schema.ts` | 7 | `@Prop({ required: true, index: true }) provider_id: string; // owner_id` |
| `src/schemas/profile-image-audit-log.schema.ts` | 16 | `ProfileImageAuditLogSchema.index({ user_id: 1, createdAt: -1 });` |
| `src/schemas/profile-image-metadata.schema.ts` | 6 | `@Prop({ required: true, index: true }) owner_id: string; // user_id or provider_profile_id` |
| `src/schemas/profile-image-metadata.schema.ts` | 21 | `ProfileImageMetadataSchema.index({ owner_id: 1, processingStatus: 1 });` |
| `src/schemas/promotion-campaign.schema.ts` | 12 | `@Prop({ required: true, index: true })` |
| `src/schemas/provider-availability.schema.ts` | 8 | `@Prop({ required: true, index: true, unique: true }) provider_id: string;` |
| `src/schemas/provider-branch.schema.ts` | 12 | `@Prop({ type: String, ref: 'ProviderProfile', required: true, index: true })` |
| `src/schemas/provider-profile.schema.ts` | 11 | `@Prop({ unique: true, sparse: true, index: true }) slug?: string;` |
| `src/schemas/provider-profile.schema.ts` | 12 | `@Prop({ required: true, index: true }) user_id: string;` |
| `src/schemas/provider-profile.schema.ts` | 13 | `@Prop({ unique: true, sparse: true, index: true }) account_id?: string;` |
| `src/schemas/push-token.schema.ts` | 7 | `@Prop({ required: true, index: true }) user_id: string;` |
| `src/schemas/radiology.schema.ts` | 19 | `@Prop({ required: true, index: true }) modality: string; // xray | ct | mri | ultrasound | mammography | dexa | fluoroscopy | pet` |
| `src/schemas/radiology.schema.ts` | 36 | `@Prop({ default: false, index: true }) is_deleted: boolean;` |
| `src/schemas/radiology.schema.ts` | 59 | `RadiologyServiceSchema.index({ name_ar: 'text', name_en: 'text' });` |
| `src/schemas/radiology.schema.ts` | 60 | `RadiologyServiceSchema.index({ modality: 1, popularity: -1 });` |
| `src/schemas/radiology.schema.ts` | 71 | `RadiologyMachineSchema.index({ provider_id: 1, is_active: 1 });` |
| `src/schemas/radiology.schema.ts` | 108 | `@Prop({ required: true, index: true }) patient_id: string;` |
| `src/schemas/radiology.schema.ts` | 199 | `RadiologyBookingSchema.index({ patient_id: 1, createdAt: -1 });` |
| `src/schemas/radiology.schema.ts` | 200 | `RadiologyBookingSchema.index({ state: 1, scheduled_at: 1 });` |
| `src/schemas/referral.schema.ts` | 12 | `@Prop({ required: true, index: true })` |
| `src/schemas/referral.schema.ts` | 15 | `@Prop({ required: true, unique: true, index: true })` |
| `src/schemas/referral.schema.ts` | 31 | `@Prop({ required: true, index: true })` |
| `src/schemas/referral.schema.ts` | 34 | `@Prop({ required: true, index: true })` |
| `src/schemas/referral.schema.ts` | 43 | `@Prop({ required: true, enum: ['pending', 'completed'], default: 'pending', index: true })` |
| `src/schemas/referral.schema.ts` | 48 | `ReferralRewardSchema.index({ referrerId: 1, refereeId: 1 }, { unique: true });` |
| `src/schemas/refund-request.schema.ts` | 8 | `@Prop({ required: true, index: true }) booking_id: string;` |
| `src/schemas/refund-request.schema.ts` | 9 | `@Prop({ required: true, index: true }) patient_id: string;` |
| `src/schemas/refund-request.schema.ts` | 12 | `@Prop({ enum: ['requested', 'approved', 'rejected', 'completed'], default: 'requested', index: true }) status: string;` |
| `src/schemas/return-request.schema.ts` | 8 | `@Prop({ required: true, index: true }) order_id: string;` |
| `src/schemas/return-request.schema.ts` | 9 | `@Prop({ required: true, index: true }) patient_id: string;` |
| `src/schemas/return-request.schema.ts` | 10 | `@Prop({ required: true, index: true }) pharmacy_id: string;` |
| `src/schemas/returns.schema.ts` | 8 | `@Prop({ required: true, index: true }) patient_id: string;` |
| `src/schemas/returns.schema.ts` | 9 | `@Prop({ required: true, index: true }) order_id: string;` |
| `src/schemas/returns.schema.ts` | 10 | `@Prop({ required: true, index: true }) service_type: string; // pharmacy | consultation | diagnostics | nursing | insurance` |
| `src/schemas/returns.schema.ts` | 16 | `@Prop({ enum: ['processing', 'approved', 'completed', 'rejected'], default: 'processing', index: true }) status: string;` |
| `src/schemas/review.schema.ts` | 7 | `@Prop({ required: true, index: true }) provider_id: string;` |
| `src/schemas/review.schema.ts` | 8 | `@Prop({ required: true, index: true }) patient_id: string;` |
| `src/schemas/review.schema.ts` | 10 | `@Prop({ required: true, index: true }) booking_id: string;` |
| `src/schemas/review.schema.ts` | 14 | `@Prop({ type: String, enum: ['pending_review', 'approved', 'rejected'], default: 'approved', index: true })` |
| `src/schemas/review.schema.ts` | 18 | `ReviewSchema.index({ booking_kind: 1, booking_id: 1 }, { unique: true });` |
| `src/schemas/sla-log.schema.ts` | 12 | `@Prop({ required: true, index: true })` |
| `src/schemas/sla-log.schema.ts` | 15 | `@Prop({ required: true, index: true })` |
| `src/schemas/sla-log.schema.ts` | 24 | `@Prop({ required: true, default: false, index: true })` |
| `src/schemas/slot-lock.schema.ts` | 10 | `@Prop({ required: true, index: true }) provider_id: string;` |
| `src/schemas/slot-lock.schema.ts` | 11 | `@Prop({ required: true, index: true }) patient_id: string;` |
| `src/schemas/slot-lock.schema.ts` | 16 | `@Prop({ required: true, index: { expires: 0 } }) expires_at: Date;` |
| `src/schemas/slot-lock.schema.ts` | 20 | `SlotLockSchema.index({ provider_id: 1, slot_start: 1, status: 1 });` |
| `src/schemas/support.schema.ts` | 25 | `@Prop({ required: true, index: true }) user_id: string;` |
| `src/schemas/support.schema.ts` | 40 | `SupportRequestSchema.index({ user_id: 1, createdAt: -1 });` |
| `src/schemas/support.schema.ts` | 41 | `SupportRequestSchema.index({ status: 1, createdAt: -1 });` |
| `src/schemas/system-config.schema.ts` | 8 | `@Prop({ required: true, unique: true, index: true }) key: string;` |
| `src/schemas/systemevent.schema.ts` | 9 | `@Prop({ required: true, index: true })` |
| `src/schemas/transaction.schema.ts` | 11 | `@Prop({ required: true, index: true }) booking_id: string;` |
| `src/schemas/transaction.schema.ts` | 17 | `@Prop({ enum: ['initiating', 'pending', 'authorized', 'paid', 'failed', 'refunded', 'partially_refunded', 'cancelled'], default: 'pending', index: true }) status: string;` |
| `src/schemas/transaction.schema.ts` | 31 | `TransactionSchema.index({ booking_kind: 1, booking_id: 1, createdAt: -1 });` |
| `src/schemas/transaction.schema.ts` | 35 | `TransactionSchema.index(` |
| `src/schemas/transaction.schema.ts` | 39 | `TransactionSchema.index(` |
| `src/schemas/transaction.schema.ts` | 43 | `TransactionSchema.index(` |
| `src/schemas/treatment-program.schema.ts` | 12 | `@Prop({ required: true, index: true })` |
| `src/schemas/treatment-program.schema.ts` | 15 | `@Prop({ required: true, enum: ['diabetes', 'hypertension', 'pregnancy'], index: true })` |
| `src/schemas/treatment-program.schema.ts` | 18 | `@Prop({ required: true, enum: ['active', 'completed'], default: 'active', index: true })` |
| `src/schemas/treatment-program.schema.ts` | 24 | `@Prop({ required: true, index: true })` |
| `src/schemas/treatment-program.schema.ts` | 29 | `TreatmentProgramSchema.index({ patientId: 1, programType: 1 }, { unique: true });` |
| `src/schemas/universal-activity.schema.ts` | 12 | `@Prop({ required: true, index: true })` |
| `src/schemas/universal-activity.schema.ts` | 15 | `@Prop({ index: true })` |
| `src/schemas/universal-activity.schema.ts` | 18 | `@Prop({ index: true })` |
| `src/schemas/universal-activity.schema.ts` | 24 | `@Prop({ default: () => new Date(), index: true })` |
| `src/schemas/universal-activity.schema.ts` | 29 | `UniversalActivitySchema.index({ eventType: 1, timestamp: -1 });` |
| `src/schemas/user.schema.ts` | 25 | `@Prop({ type: String, ref: 'ProviderProfile', default: null, index: true })` |
| `src/schemas/user.schema.ts` | 27 | `@Prop({ type: String, ref: 'ProviderBranch', default: null, index: true })` |
| `src/schemas/wallet.schema.ts` | 12 | `@Prop({ required: true, index: true })` |
| `src/schemas/wallet.schema.ts` | 15 | `@Prop({ required: true, enum: ['patient', 'provider'], index: true })` |
| `src/schemas/wallet.schema.ts` | 26 | `WalletSchema.index({ ownerId: 1, ownerType: 1 }, { unique: true });` |
| `src/schemas/wallet.schema.ts` | 35 | `@Prop({ required: true, index: true })` |
| `src/schemas/wallet.schema.ts` | 44 | `@Prop({ required: true, enum: ['booking', 'refund', 'referral', 'commission', 'insurance_escrow'], index: true })` |
| `src/schemas/wallet.schema.ts` | 47 | `@Prop({ required: true, index: true })` |
| `src/schemas/wallet.schema.ts` | 55 | `WalletTransactionSchema.index({ walletId: 1, createdAt: -1 });` |

## قرار ما قبل النشر

> لا يثبت التحليل الثابت وجود الفهارس في قاعدة البيانات المنشورة أو زمن بنائها أو سلامة rollback. يجب على المراجع تشغيل preflight مرخص على نسخة Sandbox/backup: مقارنة `getIndexes()` مع القائمة المعتمدة، قياس query plan، أخذ backup قابل للاستعادة، ثم تنفيذ أي migration أو index build ضمن نافذة change مع مراقبة وrollback. التحذيرات المرصودة سابقاً عن duplicate Mongoose indexes تبقى **BLOCKED** إلى أن يراجع مالك Backend المخطط الفعلي؛ لم تغيّر هذه الدفعة أي schema أو فهرس.

