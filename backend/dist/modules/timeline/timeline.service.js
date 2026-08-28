"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TimelineService = void 0;
const common_1 = require("@nestjs/common");
const order_repository_1 = require("./repositories/order.repository");
const prescription_repository_1 = require("./repositories/prescription.repository");
const labbooking_repository_1 = require("./repositories/labbooking.repository");
const labresult_repository_1 = require("./repositories/labresult.repository");
const homecarebooking_repository_1 = require("./repositories/homecarebooking.repository");
const appointment_repository_1 = require("./repositories/appointment.repository");
const vitalreading_repository_1 = require("./repositories/vitalreading.repository");
const medicationreminder_repository_1 = require("./repositories/medicationreminder.repository");
const customservicerequest_repository_1 = require("./repositories/customservicerequest.repository");
const radiologybooking_repository_1 = require("./repositories/radiologybooking.repository");
const medicalreport_repository_1 = require("./repositories/medicalreport.repository");
const STATUS_MAP = {
    CREATED: 'pending',
    VALIDATED: 'pending',
    PHARMACY_RECEIVED: 'active',
    DISPATCHING: 'active',
    ACCEPTED: 'active',
    PREPARING: 'in_progress',
    READY_FOR_DISPATCH: 'in_progress',
    ASSIGNED_TO_DELIVERY: 'in_progress',
    OUT_FOR_DELIVERY: 'in_progress',
    DELIVERED: 'completed',
    CANCELLED: 'cancelled',
    REJECTED: 'cancelled',
    ESCALATED_TO_ADMIN: 'active',
    PARTIALLY_FULFILLED: 'completed',
    SPLIT_FULFILLED: 'completed',
    CREATED_BY_DOCTOR: 'pending',
    SENT_TO_PHARMACY: 'active',
    FULFILLED: 'completed',
    CONFIRMED: 'active',
    SAMPLE_COLLECTED: 'in_progress',
    PROCESSING: 'in_progress',
    IN_LAB: 'in_progress',
    RESULT_READY: 'in_progress',
    REPORTED: 'completed',
    PENDING: 'pending',
    SCHEDULED: 'pending',
    IN_PROGRESS: 'in_progress',
    COMPLETED: 'completed',
    REPORT_PUBLISHED: 'completed',
    PROVIDER_ASSIGNED: 'active',
    EN_ROUTE: 'in_progress',
    ONGOING: 'in_progress',
    ENDED: 'completed',
    NO_SHOW: 'cancelled',
};
function unify(raw) {
    if (!raw)
        return 'pending';
    return STATUS_MAP[raw.toUpperCase()] || 'active';
}
const COLORS = {
    pending: '#0EA5E9',
    active: '#0EA5E9',
    in_progress: '#8B5CF6',
    completed: '#22C55E',
    cancelled: '#EF4444',
    critical: '#EF4444',
};
let TimelineService = class TimelineService {
    constructor(orderM, rxM, labBM, labRM, hcM, apptM, vitalM, remM, customM, radBM, mrM) {
        this.orderM = orderM;
        this.rxM = rxM;
        this.labBM = labBM;
        this.labRM = labRM;
        this.hcM = hcM;
        this.apptM = apptM;
        this.vitalM = vitalM;
        this.remM = remM;
        this.customM = customM;
        this.radBM = radBM;
        this.mrM = mrM;
    }
    async build(user, opts) {
        const patient_id = user?.id;
        if (!patient_id)
            return { events: [], total: 0 };
        const wants = (k) => !opts.kinds || opts.kinds.includes(k);
        const dateMatch = {};
        if (opts.since)
            dateMatch.$gte = opts.since;
        if (opts.until)
            dateMatch.$lte = opts.until;
        const evs = [];
        if (wants('order')) {
            const docs = await this.orderM
                .find({ patient_id, ...(opts.since || opts.until ? { createdAt: dateMatch } : {}) })
                .sort({ createdAt: -1 }).limit(opts.limit).lean();
            for (const o of docs) {
                const us = unify(o.state);
                evs.push({
                    kind: 'order',
                    id: String(o.id || o._id),
                    tracking_id: o.tracking_id,
                    title: (o.items || []).slice(0, 2).map((x) => x.name_ar).join(' • ') || 'طلب صيدلية',
                    subtitle: `${(o.items || []).length} عنصر • ${o.total || 0} ر.س`,
                    status_raw: o.state,
                    unified_status: us,
                    at: o.createdAt,
                    color: COLORS[us],
                    icon: 'pill',
                    links: { order_id: String(o.id || o._id), prescription_id: o.prescription_id, delivery_id: o.delivery_id },
                });
            }
        }
        if (wants('rx')) {
            const docs = await this.rxM.find({ patient_id }).sort({ createdAt: -1 }).limit(opts.limit).lean();
            for (const r of docs) {
                const us = unify(r.state);
                evs.push({
                    kind: 'rx',
                    id: String(r.id || r._id),
                    title: `وصفة طبية • ${(r.items || []).length} دواء`,
                    subtitle: r.diagnosis ? r.diagnosis : undefined,
                    status_raw: r.state,
                    unified_status: us,
                    at: r.createdAt,
                    color: COLORS[us],
                    icon: 'file-text',
                    links: { prescription_id: String(r.id || r._id), order_id: r.order_id, appointment_id: r.appointment_id, doctor_id: r.doctor_id },
                });
            }
        }
        if (wants('lab')) {
            const docs = await this.labBM.find({ patient_id }).sort({ createdAt: -1 }).limit(opts.limit).lean();
            for (const b of docs) {
                const us = unify(b.state);
                const firstItem = (b.items || [])[0];
                evs.push({
                    kind: 'lab',
                    id: String(b.id || b._id),
                    tracking_id: b.tracking_id,
                    title: firstItem?.name_ar || 'حجز تحاليل/أشعة',
                    subtitle: `${(b.items || []).length} فحص • ${b.location_type === 'home' ? 'منزلي' : 'في المركز'}`,
                    status_raw: b.state,
                    unified_status: us,
                    at: b.scheduled_at || b.createdAt,
                    color: COLORS[us],
                    icon: 'flask',
                    links: { lab_booking_id: String(b.id || b._id) },
                });
            }
        }
        if (wants('lab_result')) {
            const docs = await this.labRM.find({ patient_id, source: { $ne: 'radiology' } }).sort({ reported_at: -1, createdAt: -1 }).limit(opts.limit).lean();
            for (const r of docs) {
                const us = r.critical ? 'critical' : 'completed';
                evs.push({
                    kind: 'lab_result',
                    id: String(r.id || r._id),
                    tracking_id: r.tracking_id,
                    title: r.service_name_ar || 'نتيجة فحص',
                    subtitle: r.critical ? 'نتيجة حرجة — راجع طبيبك' : 'تم اعتماد النتيجة',
                    status_raw: r.critical ? 'CRITICAL' : 'REPORTED',
                    unified_status: us,
                    at: r.reported_at || r.createdAt,
                    color: COLORS[us],
                    icon: 'activity',
                    links: { lab_result_id: String(r.id || r._id), lab_booking_id: r.booking_id },
                });
            }
        }
        if (wants('radiology')) {
            const docs = await this.radBM.find({ patient_id }).sort({ createdAt: -1 }).limit(opts.limit).lean();
            for (const b of docs) {
                const us = unify(b.state);
                const firstItem = (b.items || [])[0];
                evs.push({
                    kind: 'radiology',
                    id: String(b.id || b._id),
                    tracking_id: b.tracking_id,
                    title: firstItem?.name_ar || 'حجز أشعة',
                    subtitle: `${(b.items || []).length} فحص • ${(firstItem?.modality || '').toUpperCase()}`,
                    status_raw: b.state,
                    unified_status: us,
                    at: b.scheduled_at || b.createdAt,
                    color: COLORS[us],
                    icon: 'scan',
                    links: { radiology_booking_id: String(b.id || b._id) },
                });
            }
        }
        if (wants('radiology_report')) {
            const docs = await this.labRM.find({ patient_id, source: 'radiology' }).sort({ reported_at: -1, createdAt: -1 }).limit(opts.limit).lean();
            for (const r of docs) {
                const us = r.critical ? 'critical' : 'completed';
                evs.push({
                    kind: 'radiology_report',
                    id: String(r.id || r._id),
                    tracking_id: r.tracking_id,
                    title: r.service_name_ar || 'تقرير أشعة',
                    subtitle: r.critical ? 'نتيجة حرجة — راجع طبيبك' : 'تم نشر التقرير',
                    status_raw: r.critical ? 'CRITICAL' : 'REPORT_PUBLISHED',
                    unified_status: us,
                    at: r.reported_at || r.createdAt,
                    color: COLORS[us],
                    icon: 'scan',
                    links: { lab_result_id: String(r.id || r._id), radiology_booking_id: r.booking_id },
                });
            }
        }
        if (wants('medical_report')) {
            const docs = await this.mrM.find({ patient_id }).sort({ issued_at: -1, createdAt: -1 }).limit(opts.limit).lean();
            for (const m of docs) {
                const us = m.critical ? 'critical' : 'completed';
                evs.push({
                    kind: 'medical_report',
                    id: String(m.id || m._id),
                    tracking_id: m.tracking_id,
                    title: m.title_ar || 'تقرير طبي',
                    subtitle: m.summary || m.diagnosis || (m.doctor_name ? `د. ${m.doctor_name}` : undefined),
                    status_raw: m.report_type || 'CLINIC_NOTE',
                    unified_status: us,
                    at: m.issued_at || m.createdAt,
                    color: COLORS[us],
                    icon: 'file-text',
                    links: { medical_report_id: String(m.id || m._id), appointment_id: m.appointment_id, lab_booking_id: m.lab_booking_id, radiology_booking_id: m.radiology_booking_id },
                });
            }
        }
        if (wants('home_care')) {
            const docs = await this.hcM.find({ patient_id }).sort({ createdAt: -1 }).limit(opts.limit).lean();
            for (const h of docs) {
                const us = unify(h.state);
                evs.push({
                    kind: 'home_care',
                    id: String(h.id || h._id),
                    tracking_id: h.tracking_id,
                    title: h.service_name_ar || 'رعاية منزلية',
                    subtitle: `${h.sessions_count || 1} جلسة • ${h.total || 0} ر.س`,
                    status_raw: h.state,
                    unified_status: us,
                    at: h.scheduled_at || h.createdAt,
                    color: COLORS[us],
                    icon: 'home',
                    links: { home_care_booking_id: String(h.id || h._id) },
                });
            }
        }
        if (wants('consultation')) {
            const docs = await this.apptM.find({ patient_id }).sort({ slot_start: -1, createdAt: -1 }).limit(opts.limit).lean();
            for (const a of docs) {
                const us = unify(a.status);
                evs.push({
                    kind: 'consultation',
                    id: String(a.id || a._id),
                    title: a.service_type === 'video' ? 'استشارة فيديو' : a.service_type === 'home' ? 'زيارة منزلية' : 'استشارة في العيادة',
                    subtitle: a.symptoms?.length ? a.symptoms.slice(0, 2).join(' • ') : undefined,
                    status_raw: a.status || 'PENDING',
                    unified_status: us,
                    at: a.slot_start || a.createdAt,
                    color: COLORS[us],
                    icon: 'stethoscope',
                    links: { appointment_id: String(a.id || a._id), doctor_id: a.doctor_id, prescription_id: a.prescription_id },
                });
            }
        }
        if (wants('vital')) {
            const docs = await this.vitalM.find({ patient_id, flag: { $in: ['high', 'low', 'critical'] } }).sort({ measured_at: -1 }).limit(opts.limit).lean();
            for (const v of docs) {
                const us = v.flag === 'critical' ? 'critical' : 'active';
                evs.push({
                    kind: 'vital',
                    id: String(v.id || v._id),
                    title: `${v.type} • ${v.value} ${v.unit || ''}`.trim(),
                    subtitle: v.flag === 'critical' ? 'قراءة حرجة' : v.flag === 'high' ? 'مرتفعة' : 'منخفضة',
                    status_raw: v.flag,
                    unified_status: us,
                    at: v.measured_at,
                    color: COLORS[us],
                    icon: 'heart',
                    links: { vital_id: String(v.id || v._id) },
                });
            }
        }
        if (wants('reminder')) {
            const docs = await this.remM.find({ patient_id }).lean();
            for (const r of docs) {
                for (const entry of (r.log || []).slice(-10)) {
                    const us = entry.status === 'taken' ? 'completed' : entry.status === 'skipped' ? 'cancelled' : 'pending';
                    evs.push({
                        kind: 'reminder',
                        id: `${r.id || r._id}-${entry.at}`,
                        title: r.medicine_name_ar,
                        subtitle: entry.status === 'taken' ? `تم الأخذ • ${entry.time_key || ''}` : entry.status === 'skipped' ? `تم التخطي • ${entry.time_key || ''}` : 'فات الموعد',
                        status_raw: entry.status,
                        unified_status: us,
                        at: new Date(entry.at),
                        color: COLORS[us],
                        icon: 'bell',
                        links: { reminder_id: String(r.id || r._id) },
                    });
                }
            }
        }
        if (wants('custom')) {
            const docs = await this.customM.find({ patient_id }).sort({ createdAt: -1 }).limit(opts.limit).lean();
            for (const c of docs) {
                const us = unify(c.state);
                evs.push({
                    kind: 'custom',
                    id: String(c.id || c._id),
                    tracking_id: c.tracking_id,
                    title: c.name_ar || 'طلب مخصص',
                    subtitle: c.kind,
                    status_raw: c.state,
                    unified_status: us,
                    at: c.createdAt,
                    color: COLORS[us],
                    icon: 'plus-circle',
                    links: { custom_service_id: String(c.id || c._id) },
                });
            }
        }
        evs.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
        const total = evs.length;
        return { events: evs.slice(0, opts.limit), total };
    }
    async summary(user) {
        const patient_id = user?.id;
        if (!patient_id)
            return {};
        const [orders, rx, labs, results, hc, appt, critVitals, radBkg, radRpts, mrCount] = await Promise.all([
            this.orderM.countDocuments({ patient_id }),
            this.rxM.countDocuments({ patient_id }),
            this.labBM.countDocuments({ patient_id }),
            this.labRM.countDocuments({ patient_id, source: { $ne: 'radiology' } }),
            this.hcM.countDocuments({ patient_id }),
            this.apptM.countDocuments({ patient_id }),
            this.vitalM.countDocuments({ patient_id, flag: 'critical' }),
            this.radBM.countDocuments({ patient_id }),
            this.labRM.countDocuments({ patient_id, source: 'radiology' }),
            this.mrM.countDocuments({ patient_id }),
        ]);
        return { orders, rx, labs, lab_results: results, home_care: hc, consultations: appt, critical_vitals: critVitals, radiology: radBkg, radiology_reports: radRpts, medical_reports: mrCount };
    }
};
exports.TimelineService = TimelineService;
exports.TimelineService = TimelineService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)('OrderRepository')),
    __param(1, (0, common_1.Inject)('PrescriptionRepository')),
    __param(2, (0, common_1.Inject)('LabBookingRepository')),
    __param(3, (0, common_1.Inject)('LabResultRepository')),
    __param(4, (0, common_1.Inject)('HomeCareBookingRepository')),
    __param(5, (0, common_1.Inject)('AppointmentRepository')),
    __param(6, (0, common_1.Inject)('VitalReadingRepository')),
    __param(7, (0, common_1.Inject)('MedicationReminderRepository')),
    __param(8, (0, common_1.Inject)('CustomServiceRequestRepository')),
    __param(9, (0, common_1.Inject)('RadiologyBookingRepository')),
    __param(10, (0, common_1.Inject)('MedicalReportRepository')),
    __metadata("design:paramtypes", [order_repository_1.OrderRepository,
        prescription_repository_1.PrescriptionRepository,
        labbooking_repository_1.LabBookingRepository,
        labresult_repository_1.LabResultRepository,
        homecarebooking_repository_1.HomeCareBookingRepository,
        appointment_repository_1.AppointmentRepository,
        vitalreading_repository_1.VitalReadingRepository,
        medicationreminder_repository_1.MedicationReminderRepository,
        customservicerequest_repository_1.CustomServiceRequestRepository,
        radiologybooking_repository_1.RadiologyBookingRepository,
        medicalreport_repository_1.MedicalReportRepository])
], TimelineService);
//# sourceMappingURL=timeline.service.js.map