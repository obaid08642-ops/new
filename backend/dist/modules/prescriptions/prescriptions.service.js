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
exports.PrescriptionsService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const event_emitter_1 = require("@nestjs/event-emitter");
const appointment_schema_1 = require("../../schemas/appointment.schema");
const provider_profile_schema_1 = require("../../schemas/provider-profile.schema");
const enums_1 = require("../../common/enums");
const events_1 = require("../../common/events");
const medicines_service_1 = require("../medicines/medicines.service");
const prescription_repository_1 = require("./repositories/prescription.repository");
const auth_guard_1 = require("../../common/auth.guard");
let PrescriptionsService = class PrescriptionsService {
    constructor(model, medicines, events, appointments, providers) {
        this.model = model;
        this.medicines = medicines;
        this.events = events;
        this.appointments = appointments;
        this.providers = providers;
    }
    isPrivilegedAdmin(user) {
        const roles = (0, auth_guard_1.getEffectiveRoles)(user);
        return roles.includes(enums_1.UserRole.ADMIN) || roles.includes(enums_1.UserRole.SUPER_ADMIN);
    }
    isOwningDoctor(rx, user) {
        return (0, auth_guard_1.getEffectiveRoles)(user).includes(enums_1.UserRole.DOCTOR) && String(rx?.doctor_id || '') === String(user?.id || '');
    }
    isAssignedPharmacy(rx, user) {
        return (0, auth_guard_1.getEffectiveRoles)(user).includes(enums_1.UserRole.PHARMACY) && String(rx?.pharmacy_id || '') === String(user?.id || '');
    }
    async create(doctor, data) {
        if (!(0, auth_guard_1.getEffectiveRoles)(doctor).includes(enums_1.UserRole.DOCTOR)) {
            throw new common_1.BadRequestException('doctor role is required to create a prescription');
        }
        const doctorId = String(doctor?.id || '');
        const patientId = String(data?.patient_id || '');
        const appointmentId = String(data?.appointment_id || '');
        if (!doctorId || !patientId || !appointmentId) {
            throw new common_1.BadRequestException('verified appointment and patient are required');
        }
        if (!Array.isArray(data?.items) || data.items.length === 0) {
            throw new common_1.BadRequestException('at least one approved medicine is required');
        }
        const appointment = await this.appointments.findOne({
            id: appointmentId,
            patient_id: patientId,
            status: appointment_schema_1.APPT_STATES.IN_PROGRESS,
        });
        const actorIds = [
            doctor?.id,
            doctor?.account_id,
            doctor?.provider_id,
            doctor?.provider_profile_id,
        ].filter((value) => typeof value === 'string' && value.length > 0);
        const appointmentDoctorIds = [appointment?.doctor_user_id, appointment?.doctor_id]
            .filter((value) => typeof value === 'string' && value.length > 0);
        if (!appointment || !actorIds.some(id => appointmentDoctorIds.includes(id))) {
            throw new common_1.NotFoundException('verified in-progress appointment not found');
        }
        const items = [];
        for (const item of data.items) {
            const medicineId = String(item?.medicine_id || '').trim();
            const dose = String(item?.dose || '').trim();
            const durationDays = Number(item?.duration_days);
            if (!dose || !Number.isFinite(durationDays) || durationDays <= 0) {
                throw new common_1.BadRequestException('dose and positive duration_days are required');
            }
            if (!medicineId) {
                const manualNameAr = String(item?.manual_name_ar || '').trim();
                const manualNameEn = String(item?.manual_name_en || '').trim();
                if (!manualNameAr && !manualNameEn) {
                    throw new common_1.BadRequestException('manual medicine name is required');
                }
                items.push({
                    medicine_id: undefined,
                    medicine_name_ar: manualNameAr || manualNameEn,
                    medicine_name_en: manualNameEn || undefined,
                    active_ingredient: String(item?.manual_active_ingredient || '').trim() || undefined,
                    dose,
                    frequency_hours: item.frequency_hours,
                    times_per_day: item.times_per_day,
                    duration_days: durationDays,
                    instructions: item.instructions,
                    is_manual_entry: true,
                    verified: false,
                    manual_review_status: 'PENDING_REVIEW',
                });
                continue;
            }
            const medicine = await this.medicines.getById(medicineId);
            if (medicine?.verified !== true) {
                throw new common_1.BadRequestException('medicine must be approved before prescription use');
            }
            items.push({
                medicine_id: medicine.id,
                medicine_name_ar: medicine.name_ar,
                medicine_name_en: medicine.name_en,
                active_ingredient: medicine.active_ingredient,
                dose,
                frequency_hours: item.frequency_hours,
                times_per_day: item.times_per_day,
                duration_days: durationDays,
                instructions: item.instructions,
                is_manual_entry: false,
                verified: true,
                manual_review_status: 'NOT_APPLICABLE',
            });
        }
        const rx = await this.model.create({
            doctor_id: doctorId,
            patient_id: patientId,
            appointment_id: appointmentId,
            items,
            diagnosis: String(data?.diagnosis || '').trim() || undefined,
            notes: String(data?.notes || '').trim() || undefined,
            has_manual_entries: items.some(item => item.is_manual_entry),
            state: enums_1.PrescriptionState.CREATED_BY_DOCTOR,
        });
        await this.appointments.updateOne({ id: appointmentId, patient_id: patientId, doctor_id: appointment.doctor_id }, { $addToSet: { prescriptions: rx.id } });
        this.events.emit(events_1.EVENTS.PRESCRIPTION_CREATED, {
            prescription_id: rx.id,
            patient_id: patientId,
            doctor_id: doctorId,
            appointment_id: appointmentId,
        });
        return rx.toObject();
    }
    async uploadByPatient(patient, data) {
        const items = [];
        let hasManual = false;
        for (const it of data.items || []) {
            const medName = (it.name_ar || it.medicine_name_ar || it.name || it.name_en || '').toString().trim();
            const medNameEn = (it.name_en || it.medicine_name_en || '').toString().trim() || undefined;
            if (!medName)
                continue;
            let medId = it.medicine_id;
            if (!medId) {
                try {
                    const m = await this.medicines.createManualEntry({ name_ar: medName, name_en: medNameEn, active_ingredient: it.active_ingredient, category: 'medications' }, patient.id, patient.role);
                    medId = m.id;
                    hasManual = true;
                }
                catch (e) {
                    medId = undefined;
                    hasManual = true;
                }
            }
            items.push({
                medicine_id: medId,
                medicine_name_ar: medName,
                medicine_name_en: medNameEn,
                active_ingredient: it.active_ingredient,
                dose: it.dose,
                frequency_hours: it.frequency_hours,
                times_per_day: it.times_per_day,
                duration_days: it.duration_days,
                quantity: it.quantity,
                instructions: it.frequency || it.instructions,
                is_manual_entry: !it.medicine_id,
            });
        }
        const rx = await this.model.create({
            patient_id: patient.id,
            upload_image: data.upload_image,
            notes: data.notes,
            state: enums_1.PrescriptionState.CREATED_BY_DOCTOR,
            items,
            has_manual_entries: hasManual,
        });
        this.events.emit(events_1.EVENTS.PRESCRIPTION_CREATED, { prescription_id: rx.id, patient_id: rx.patient_id });
        return rx.toObject();
    }
    async transition(id, to, by) {
        const rx = await this.model.findOne({ id });
        if (!rx)
            throw new common_1.NotFoundException();
        const isAdmin = this.isPrivilegedAdmin(by);
        const isInitialDoctorTransition = rx.state === enums_1.PrescriptionState.CREATED_BY_DOCTOR && this.isOwningDoctor(rx, by);
        const isAssignedPharmacyTransition = rx.state !== enums_1.PrescriptionState.CREATED_BY_DOCTOR && this.isAssignedPharmacy(rx, by);
        if (!isAdmin && !isInitialDoctorTransition && !isAssignedPharmacyTransition) {
            throw new common_1.NotFoundException();
        }
        const allowed = enums_1.PRESCRIPTION_TRANSITIONS[rx.state] || [];
        if (!isAdmin && !allowed.includes(to)) {
            throw new common_1.BadRequestException(`Invalid transition ${rx.state} → ${to}`);
        }
        if (to === enums_1.PrescriptionState.DISPENSED && (rx.items || []).some((item) => item.is_manual_entry && item.manual_review_status !== 'SUBSTITUTED_APPROVED')) {
            throw new common_1.BadRequestException('manual prescription items require an approved substitute before dispensing');
        }
        rx.state = to;
        if (to === enums_1.PrescriptionState.SENT_TO_PHARMACY)
            this.events.emit(events_1.EVENTS.PRESCRIPTION_SENT, { prescription_id: id });
        if (to === enums_1.PrescriptionState.DISPENSED)
            this.events.emit(events_1.EVENTS.PRESCRIPTION_DISPENSED, { prescription_id: id });
        await rx.save();
        return rx.toObject();
    }
    async sendToPharmacy(id, pharmacy_id, by) {
        const rx = await this.model.findOne({ id });
        if (!rx || (!this.isPrivilegedAdmin(by) && !this.isOwningDoctor(rx, by)))
            throw new common_1.NotFoundException();
        if (rx.state !== enums_1.PrescriptionState.CREATED_BY_DOCTOR) {
            throw new common_1.BadRequestException(`Invalid transition ${rx.state} → ${enums_1.PrescriptionState.SENT_TO_PHARMACY}`);
        }
        rx.pharmacy_id = String(pharmacy_id || '');
        if (!rx.pharmacy_id)
            throw new common_1.BadRequestException('pharmacy_id is required');
        rx.state = enums_1.PrescriptionState.SENT_TO_PHARMACY;
        await rx.save();
        this.events.emit(events_1.EVENTS.PRESCRIPTION_SENT, { prescription_id: id, pharmacy_id: rx.pharmacy_id });
        return rx.toObject();
    }
    async substitute(id, itemIndex, newMedicineId, by) {
        const rx = await this.model.findOne({ id });
        if (!rx || (!this.isPrivilegedAdmin(by) && !this.isAssignedPharmacy(rx, by)))
            throw new common_1.NotFoundException();
        const item = rx.items[itemIndex];
        if (!item)
            throw new common_1.BadRequestException('Invalid item index');
        const medicine = await this.medicines.getById(String(newMedicineId || ''));
        if (medicine?.verified !== true) {
            throw new common_1.BadRequestException('manual prescription items require an approved substitute');
        }
        item.substituted = true;
        item.substituted_to_medicine_id = medicine.id;
        if (item.is_manual_entry) {
            item.manual_review_status = 'SUBSTITUTED_APPROVED';
            item.manual_reviewed_by = by?.id;
            item.manual_reviewed_at = new Date();
        }
        rx.state = enums_1.PrescriptionState.PARTIALLY_EDITED;
        await rx.save();
        this.events.emit(events_1.EVENTS.PRESCRIPTION_MODIFIED, { prescription_id: id });
        return rx.toObject();
    }
    async manualReviewQueue(user) {
        const query = {
            has_manual_entries: true,
            'items.manual_review_status': 'PENDING_REVIEW',
        };
        if (user?.role !== enums_1.UserRole.ADMIN)
            query.pharmacy_id = user?.id;
        return this.model.find(query, { _id: 0, __v: 0 }).sort({ createdAt: -1 }).limit(100);
    }
    async activeForPatient(user) {
        return this.model.find({ patient_id: user.id, state: { $nin: [enums_1.PrescriptionState.DISPENSED, enums_1.PrescriptionState.ARCHIVED] } }, { _id: 0, __v: 0 }).sort({ createdAt: -1 }).limit(100);
    }
    async listMine(patient_id) {
        return this.model.find({ patient_id }, { _id: 0, __v: 0 }).sort({ createdAt: -1 }).limit(100);
    }
    async listForDoctor(doctor_id) {
        return this.model.find({ doctor_id }, { _id: 0, __v: 0 }).sort({ createdAt: -1 }).limit(200);
    }
    async listForPharmacy(pharmacy_id) {
        return this.model.find({ pharmacy_id, state: { $in: [enums_1.PrescriptionState.SENT_TO_PHARMACY, enums_1.PrescriptionState.PARTIALLY_EDITED, enums_1.PrescriptionState.APPROVED] } }, { _id: 0, __v: 0 }).sort({ createdAt: -1 }).limit(200);
    }
    async toPatientWebDto(rx) {
        let doctor = null;
        if (rx.doctor_id) {
            doctor = await this.providers.findOne({
                $or: [{ user_id: rx.doctor_id }, { account_id: rx.doctor_id }, { id: rx.doctor_id }],
            }, { _id: 0, display_name_ar: 1, display_name_en: 1, name_ar: 1, name_en: 1, specialty: 1 }).lean();
        }
        return {
            id: rx.id,
            status: rx.state,
            items: (rx.items || []).map((item) => ({
                name: item.medicine_name_ar || item.medicine_name_en || null,
                dose: item.dose || null,
                frequency: item.frequency_hours != null ? { every_hours: item.frequency_hours } : (item.times_per_day != null ? { times_per_day: item.times_per_day } : null),
                duration: item.duration_days ?? null,
            })),
            issued_at: rx.createdAt ? new Date(rx.createdAt).toISOString() : null,
            doctor: {
                display_name: doctor?.display_name_ar || doctor?.display_name_en || doctor?.name_ar || doctor?.name_en || null,
                specialty: doctor?.specialty || null,
            },
        };
    }
    async getByIdForUser(id, user) {
        const rx = await this.model.findOne({ id }, { _id: 0, __v: 0 });
        if (!rx)
            throw new common_1.NotFoundException();
        const roles = (0, auth_guard_1.getEffectiveRoles)(user);
        const hasPrivilegedAdminRole = roles.includes(enums_1.UserRole.ADMIN) || roles.includes(enums_1.UserRole.SUPER_ADMIN);
        const isParticipant = [rx.patient_id, rx.doctor_id, rx.pharmacy_id].filter(Boolean).includes(user?.id);
        if (!hasPrivilegedAdminRole && !isParticipant)
            throw new common_1.NotFoundException();
        return this.toPatientWebDto(rx);
    }
};
exports.PrescriptionsService = PrescriptionsService;
exports.PrescriptionsService = PrescriptionsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)('PrescriptionRepository')),
    __param(3, (0, mongoose_1.InjectModel)(appointment_schema_1.Appointment.name)),
    __param(4, (0, mongoose_1.InjectModel)(provider_profile_schema_1.ProviderProfile.name)),
    __metadata("design:paramtypes", [prescription_repository_1.PrescriptionRepository,
        medicines_service_1.MedicinesService,
        event_emitter_1.EventEmitter2,
        mongoose_2.Model,
        mongoose_2.Model])
], PrescriptionsService);
//# sourceMappingURL=prescriptions.service.js.map