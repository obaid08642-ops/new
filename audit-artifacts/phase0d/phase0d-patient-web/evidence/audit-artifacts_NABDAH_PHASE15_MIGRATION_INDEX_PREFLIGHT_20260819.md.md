# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `audit-artifacts/NABDAH_PHASE15_MIGRATION_INDEX_PREFLIGHT_20260819.md`
- **Member SHA-256:** `2f90300d5e8734084cc9d3badf85123923f0c5c8cae432393761a7be0aa68c7d`
- **Line count:** 324
- **Read range:** `1-324`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `25: | `src/schemas/analytics-event.schema.ts` | 9 | `@Prop({ required: true, index: true }) event_type: string; // search, click, page_view, add_to_cart, booking_attempt` |`
- `37: | `src/schemas/approval-request.schema.ts` | 19 | `@Prop({ required: true, index: true }) submitted_by: string; // user_id of provider` |`
- `43: | `src/schemas/audit-log.schema.ts` | 8 | `@Prop({ required: true, index: true }) action: string; // login_failed, payment_create, refund, admin_force_cancel...` |`
- `102: | `src/schemas/fraud-alert.schema.ts` | 18 | `@Prop({ required: true, enum: ['duplicate_reviews_same_ip', 'rapid_bookings'], index: true })` |`
- `115: | `src/schemas/home-care.schema.ts` | 142 | `HomeCareBookingSchema.index({ patient_id: 1, createdAt: -1 });` |`
- `116: | `src/schemas/home-care.schema.ts` | 143 | `HomeCareBookingSchema.index({ state: 1, scheduled_at: 1 });` |`
- `117: | `src/schemas/home-care.schema.ts` | 170 | `@Prop({ required: true, index: true }) booking_id: string;` |`
- `120: | `src/schemas/home-care.schema.ts` | 195 | `@Prop({ default: 'active', index: true }) status: string; // active | completed | cancelled` |`
- `145: | `src/schemas/insurance.schema.ts` | 80 | `@Prop({ type: String, enum: ['PENDING_PROVIDER_REVIEW', 'SUBMITTED_TO_INSURANCE', 'APPROVED', 'PARTIALLY_APPROVED', 'REJECTED'], default: 'PENDING_PROVIDER_REVIEW', index: true })` |`
- `157: | `src/schemas/job-board.schema.ts` | 54 | `@Prop({ type: String, enum: ['submitted', 'under_review', 'interviewing', 'accepted', 'rejected'], default: 'submitted', index: true })` |`
- `158: | `src/schemas/lab-result.schema.ts` | 17 | `@Prop({ required: true, index: true }) booking_id: string;` |`
- `162: | `src/schemas/lab-result.schema.ts` | 48 | `LabResultSchema.index({ booking_id: 1 });` |`
### backend_consumers_or_contracts
- `112: | `src/schemas/home-care.schema.ts` | 31 | `@Prop({ required: true, index: true }) category: string; // nursing | physio | elderly | baby | iv | wound | injection | post_op | followup` |`
- `113: | `src/schemas/home-care.schema.ts` | 55 | `@Prop({ required: true, index: true }) patient_id: string;` |`
- `114: | `src/schemas/home-care.schema.ts` | 58 | `@Prop({ index: true }) service_id?: string;` |`
- `115: | `src/schemas/home-care.schema.ts` | 142 | `HomeCareBookingSchema.index({ patient_id: 1, createdAt: -1 });` |`
- `116: | `src/schemas/home-care.schema.ts` | 143 | `HomeCareBookingSchema.index({ state: 1, scheduled_at: 1 });` |`
- `117: | `src/schemas/home-care.schema.ts` | 170 | `@Prop({ required: true, index: true }) booking_id: string;` |`
- `118: | `src/schemas/home-care.schema.ts` | 188 | `@Prop({ index: true }) id: string;` |`
- `119: | `src/schemas/home-care.schema.ts` | 189 | `@Prop({ required: true, index: true }) patient_id: string;` |`
- `120: | `src/schemas/home-care.schema.ts` | 195 | `@Prop({ default: 'active', index: true }) status: string; // active | completed | cancelled` |`
- `121: | `src/schemas/home-care.schema.ts` | 210 | `@Prop({ default: true, index: true }) active: boolean;` |`
- `122: | `src/schemas/home-care.schema.ts` | 217 | `@Prop({ index: true }) id: string;` |`
- `123: | `src/schemas/home-care.schema.ts` | 218 | `@Prop({ required: true, index: true }) visit_report_id: string;` |`
### auth_ownership
- `27: | `src/schemas/analytics-event.schema.ts` | 12 | `@Prop({ index: true }) session_id?: string;` |`
- `43: | `src/schemas/audit-log.schema.ts` | 8 | `@Prop({ required: true, index: true }) action: string; // login_failed, payment_create, refund, admin_force_cancel...` |`
- `49: | `src/schemas/callmetric.schema.ts` | 8 | `@Prop({ required: true, index: true }) session_id: string;` |`
- `51: | `src/schemas/callsession.schema.ts` | 7 | `@Prop({ default: () => uuidv4(), unique: true, index: true }) id: string;` |`
- `52: | `src/schemas/callsession.schema.ts` | 8 | `@Prop({ required: true, index: true }) appointment_id: string;` |`
- `53: | `src/schemas/callsession.schema.ts` | 9 | `@Prop({ required: true, index: true }) patient_id: string;` |`
- `54: | `src/schemas/callsession.schema.ts` | 13 | `@Prop({ default: 'INITIATED', index: true }) status: string; // INITIATED | ACTIVE | ENDED | FAILED` |`
- `55: | `src/schemas/chat-session.schema.ts` | 8 | `@Prop({ required: true, enum: ['CLINICAL', 'FAMILY'], index: true })` |`
- `56: | `src/schemas/chat-session.schema.ts` | 11 | `@Prop({ type: String, ref: 'Appointment', default: null, index: true })` |`
- `57: | `src/schemas/chat-session.schema.ts` | 14 | `@Prop({ type: String, ref: 'FamilyGroup', default: null, index: true })` |`
- `58: | `src/schemas/chat-session.schema.ts` | 21 | `index: true` |`
- `92: | `src/schemas/family.schemas.ts` | 20 | `@Prop({ required: true, index: true }) owner_id: string;` |`
### state_transitions
- `23: | `src/schemas/ambulance-vehicle.schema.ts` | 29 | `@Prop({ type: String, enum: ['pending', 'approved', 'rejected', 'suspended'], default: 'pending', index: true })` |`
- `30: | `src/schemas/appointment.schema.ts` | 71 | `@Prop({ type: String, enum: Object.values(APPT_STATES), default: APPT_STATES.PENDING, index: true })` |`
- `33: | `src/schemas/appointment.schema.ts` | 137 | `AppointmentSchema.index({ doctor_id: 1, status: 1, slot_start: -1 });` |`
- `36: | `src/schemas/approval-request.schema.ts` | 17 | `@Prop({ type: String, enum: Object.values(ApprovalStatus), default: ApprovalStatus.PENDING_REVIEW, index: true })` |`
- `38: | `src/schemas/approval-request.schema.ts` | 28 | `ApprovalRequestSchema.index({ entity_type: 1, entity_id: 1, status: 1 });` |`
- `40: | `src/schemas/article.schema.ts` | 23 | `@Prop({ default: 'DRAFT', index: true }) status: string; // DRAFT | PUBLISHED` |`
- `42: | `src/schemas/article.schema.ts` | 31 | `ArticleSchema.index({ status: 1, published_at: -1 });` |`
- `43: | `src/schemas/audit-log.schema.ts` | 8 | `@Prop({ required: true, index: true }) action: string; // login_failed, payment_create, refund, admin_force_cancel...` |`
- `47: | `src/schemas/b2b-request.schema.ts` | 11 | `@Prop({ default: 'pending', index: true }) status: 'pending' | 'approved' | 'rejected';` |`
- `54: | `src/schemas/callsession.schema.ts` | 13 | `@Prop({ default: 'INITIATED', index: true }) status: string; // INITIATED | ACTIVE | ENDED | FAILED` |`
- `62: | `src/schemas/community.schemas.ts` | 25 | `@Prop({ default: 'published', index: true }) status: string;` |`
- `66: | `src/schemas/community.schemas.ts` | 58 | `@Prop({ default: 'upcoming', index: true }) status: string;` |`
### payment_insurance_relevance
- `43: | `src/schemas/audit-log.schema.ts` | 8 | `@Prop({ required: true, index: true }) action: string; // login_failed, payment_create, refund, admin_force_cancel...` |`
- `140: | `src/schemas/insurance.schema.ts` | 8 | `@Prop({ required: true, index: true }) company_id: string; // FK to InsuranceCompany.id` |`
- `141: | `src/schemas/insurance.schema.ts` | 11 | `@Prop({ required: true, index: true }) network_id: string; // FK to InsuranceNetwork.id` |`
- `142: | `src/schemas/insurance.schema.ts` | 37 | `@Prop({ required: true, index: true }) company_id: string;` |`
- `143: | `src/schemas/insurance.schema.ts` | 50 | `@Prop({ required: true, index: true }) network_id: string;` |`
- `144: | `src/schemas/insurance.schema.ts` | 65 | `@Prop({ required: true, index: true }) patient_id: string;` |`
- `145: | `src/schemas/insurance.schema.ts` | 80 | `@Prop({ type: String, enum: ['PENDING_PROVIDER_REVIEW', 'SUBMITTED_TO_INSURANCE', 'APPROVED', 'PARTIALLY_APPROVED', 'REJECTED'], default: 'PENDING_PROVIDER_REVIEW', index: true })` |`
- `163: | `src/schemas/lab.schema.ts` | 15 | `@Prop({ required: true, index: true }) category: string; // blood | hormones | diabetes | vitamins | cardiac | imaging | kidney | liver` |`
- `268: | `src/schemas/refund-request.schema.ts` | 8 | `@Prop({ required: true, index: true }) booking_id: string;` |`
- `269: | `src/schemas/refund-request.schema.ts` | 9 | `@Prop({ required: true, index: true }) patient_id: string;` |`
- `270: | `src/schemas/refund-request.schema.ts` | 12 | `@Prop({ enum: ['requested', 'approved', 'rejected', 'completed'], default: 'requested', index: true }) status: string;` |`
- `276: | `src/schemas/returns.schema.ts` | 10 | `@Prop({ required: true, index: true }) service_type: string; // pharmacy | consultation | diagnostics | nursing | insurance` |`
### error_empty_loading_retry_cancel
- `23: | `src/schemas/ambulance-vehicle.schema.ts` | 29 | `@Prop({ type: String, enum: ['pending', 'approved', 'rejected', 'suspended'], default: 'pending', index: true })` |`
- `30: | `src/schemas/appointment.schema.ts` | 71 | `@Prop({ type: String, enum: Object.values(APPT_STATES), default: APPT_STATES.PENDING, index: true })` |`
- `36: | `src/schemas/approval-request.schema.ts` | 17 | `@Prop({ type: String, enum: Object.values(ApprovalStatus), default: ApprovalStatus.PENDING_REVIEW, index: true })` |`
- `43: | `src/schemas/audit-log.schema.ts` | 8 | `@Prop({ required: true, index: true }) action: string; // login_failed, payment_create, refund, admin_force_cancel...` |`
- `47: | `src/schemas/b2b-request.schema.ts` | 11 | `@Prop({ default: 'pending', index: true }) status: 'pending' | 'approved' | 'rejected';` |`
- `54: | `src/schemas/callsession.schema.ts` | 13 | `@Prop({ default: 'INITIATED', index: true }) status: string; // INITIATED | ACTIVE | ENDED | FAILED` |`
- `98: | `src/schemas/family.schemas.ts` | 65 | `@Prop({ default: 'pending', index: true }) status: string;` |`
- `103: | `src/schemas/fraud-alert.schema.ts` | 24 | `@Prop({ required: true, enum: ['pending', 'flagged', 'dismissed'], default: 'pending', index: true })` |`
- `108: | `src/schemas/health.schema.ts` | 47 | `@Prop({ index: true }) refill_pending_order_id?: string;` |`
- `120: | `src/schemas/home-care.schema.ts` | 195 | `@Prop({ default: 'active', index: true }) status: string; // active | completed | cancelled` |`
- `125: | `src/schemas/home-care.schema.ts` | 225 | `@Prop({ default: 'pending', index: true }) status: string; // pending | approved | dispatched | delivered | rejected` |`
- `139: | `src/schemas/image-processing-job.schema.ts` | 11 | `@Prop({ required: true, enum: ['pending', 'processing', 'completed', 'failed'], default: 'pending', index: true })` |`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
