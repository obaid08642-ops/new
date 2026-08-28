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
exports.FacilityOpsModule = exports.FacilityCommsController = exports.FacilitySurgeriesController = exports.FacilityShiftsController = exports.FacilityBedsController = exports.SurgeriesService = exports.ShiftsService = exports.BedsService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const auth_guard_1 = require("../../common/auth.guard");
const uuid_1 = require("uuid");
const hospital_operations_schema_1 = require("../../schemas/hospital-operations.schema");
let BedsService = class BedsService {
    constructor(wardModel, bedModel, admissionModel, conn) {
        this.wardModel = wardModel;
        this.bedModel = bedModel;
        this.admissionModel = admissionModel;
        this.conn = conn;
    }
    async listAdmissions(facilityId, status) {
        const filter = { facility_id: facilityId };
        if (status)
            filter.status = status;
        const rows = await this.admissionModel.find(filter).sort({ admitted_at: -1 }).limit(200).lean();
        const patientIds = [...new Set(rows.map((r) => r.patient_id).filter(Boolean))];
        const users = patientIds.length
            ? await this.conn.db.collection('users')
                .find({ id: { $in: patientIds } }, { projection: { _id: 0, id: 1, full_name: 1, name: 1, phone: 1 } })
                .toArray()
            : [];
        const nameMap = new Map(users.map((u) => [u.id, u.full_name || u.name || u.phone || '']));
        return rows.map((r) => ({
            id: r.id,
            patient_id: r.patient_id,
            patient_name: nameMap.get(r.patient_id) || '',
            bed_id: r.bed_id,
            admitted_at: r.admitted_at,
            discharged_at: r.discharged_at || null,
            status: r.status,
            discharge_summary: r.discharge_summary || null,
        }));
    }
    async listWards(facilityId) {
        return this.wardModel.find({ facility_id: facilityId }).lean();
    }
    async getWardBeds(wardId) {
        return this.bedModel.find({ ward_id: wardId }).lean();
    }
    async createWard(facilityId, name, totalBeds) {
        const ward = await this.wardModel.create({
            id: (0, uuid_1.v4)(),
            facility_id: facilityId,
            name,
            total_beds: totalBeds,
            available_beds: totalBeds,
        });
        for (let i = 1; i <= totalBeds; i++) {
            await this.bedModel.create({
                id: (0, uuid_1.v4)(),
                ward_id: ward.id,
                bed_number: `${name}-${i}`,
                type: 'general',
                status: 'available',
            });
        }
        return ward;
    }
    async admitPatient(facilityId, patientId, bedId) {
        const bed = await this.bedModel.findOne({ id: bedId });
        if (!bed)
            throw new common_1.NotFoundException('bed_not_found');
        if (bed.status !== 'available')
            throw new common_1.BadRequestException('bed_not_available');
        const ward = await this.wardModel.findOne({ id: bed.ward_id });
        if (!ward)
            throw new common_1.NotFoundException('ward_not_found');
        await this.bedModel.updateOne({ id: bedId }, { $set: { status: 'occupied', occupied_by_patient_id: patientId } });
        const admission = await this.admissionModel.create({
            id: (0, uuid_1.v4)(),
            patient_id: patientId,
            facility_id: facilityId,
            bed_id: bedId,
            admitted_at: new Date(),
            status: 'active',
        });
        await this.wardModel.updateOne({ id: bed.ward_id }, { $inc: { available_beds: -1 } });
        return admission;
    }
    async dischargePatient(facilityId, admissionId, summary) {
        const admission = await this.admissionModel.findOne({ id: admissionId, facility_id: facilityId });
        if (!admission)
            throw new common_1.NotFoundException('admission_not_found');
        if (admission.status === 'discharged')
            throw new common_1.BadRequestException('already_discharged');
        const bed = await this.bedModel.findOne({ id: admission.bed_id });
        if (!bed)
            throw new common_1.NotFoundException('bed_not_found');
        await this.admissionModel.updateOne({ id: admissionId }, {
            $set: {
                status: 'discharged',
                discharged_at: new Date(),
                ...(summary && (summary.diagnosis || summary.medications || summary.instructions)
                    ? {
                        discharge_summary: {
                            diagnosis: (summary.diagnosis || '').slice(0, 4000),
                            medications: (summary.medications || '').slice(0, 4000),
                            instructions: (summary.instructions || '').slice(0, 4000),
                            created_at: new Date(),
                        },
                    }
                    : {}),
            },
        });
        await this.bedModel.updateOne({ id: admission.bed_id }, { $set: { status: 'available', occupied_by_patient_id: null } });
        await this.wardModel.updateOne({ id: bed.ward_id }, { $inc: { available_beds: 1 } });
        return { ok: true };
    }
};
exports.BedsService = BedsService;
exports.BedsService = BedsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(hospital_operations_schema_1.Ward.name)),
    __param(1, (0, mongoose_1.InjectModel)(hospital_operations_schema_1.Bed.name)),
    __param(2, (0, mongoose_1.InjectModel)(hospital_operations_schema_1.Admission.name)),
    __param(3, (0, mongoose_1.InjectConnection)()),
    __metadata("design:paramtypes", [mongoose_2.Model,
        mongoose_2.Model,
        mongoose_2.Model,
        mongoose_2.Connection])
], BedsService);
let ShiftsService = class ShiftsService {
    constructor(shiftModel, attendanceModel) {
        this.shiftModel = shiftModel;
        this.attendanceModel = attendanceModel;
    }
    async listShifts(facilityId) {
        return this.shiftModel.find({ facility_id: facilityId }).lean();
    }
    async createShift(facilityId, body) {
        return this.shiftModel.create({
            id: (0, uuid_1.v4)(),
            facility_id: facilityId,
            ...body,
            status: 'scheduled',
        });
    }
    async requestSubstitute(facilityId, shiftId) {
        const shift = await this.shiftModel.findOne({ id: shiftId, facility_id: facilityId });
        if (!shift)
            throw new common_1.NotFoundException('shift_not_found');
        await this.shiftModel.updateOne({ id: shiftId, facility_id: facilityId }, { $set: { status: 'substitute' } });
        return { ok: true };
    }
    async updateShift(facilityId, shiftId, body) {
        const shift = await this.shiftModel.findOne({ id: shiftId, facility_id: facilityId });
        if (!shift)
            throw new common_1.NotFoundException('shift_not_found');
        const allowed = ['user_id', 'department_id', 'start_time', 'end_time', 'day_of_week', 'status'];
        const patch = Object.fromEntries(Object.entries(body || {}).filter(([key, value]) => allowed.includes(key) && value !== undefined));
        if (!Object.keys(patch).length)
            throw new common_1.BadRequestException('no_mutable_shift_fields');
        await this.shiftModel.updateOne({ id: shiftId, facility_id: facilityId }, { $set: patch });
        return this.shiftModel.findOne({ id: shiftId, facility_id: facilityId }).lean();
    }
    async deleteShift(facilityId, shiftId) {
        const deleted = await this.shiftModel.findOneAndDelete({ id: shiftId, facility_id: facilityId }).lean();
        if (!deleted)
            throw new common_1.NotFoundException('shift_not_found');
        return { ok: true, id: shiftId };
    }
    async checkIn(facilityId, userId, lat, lng) {
        return this.attendanceModel.create({
            id: (0, uuid_1.v4)(),
            user_id: userId,
            facility_id: facilityId,
            check_in_time: new Date(),
            location_lat: lat,
            location_lng: lng,
            status: 'present',
        });
    }
    async checkOut(facilityId, attendanceId) {
        const att = await this.attendanceModel.findOne({ id: attendanceId, facility_id: facilityId });
        if (!att)
            throw new common_1.NotFoundException('attendance_record_not_found');
        await this.attendanceModel.updateOne({ id: attendanceId }, { $set: { check_out_time: new Date() } });
        return { ok: true };
    }
    async getAttendance(facilityId) {
        return this.attendanceModel.find({ facility_id: facilityId }).sort({ check_in_time: -1 }).lean();
    }
};
exports.ShiftsService = ShiftsService;
exports.ShiftsService = ShiftsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(hospital_operations_schema_1.Shift.name)),
    __param(1, (0, mongoose_1.InjectModel)(hospital_operations_schema_1.Attendance.name)),
    __metadata("design:paramtypes", [mongoose_2.Model,
        mongoose_2.Model])
], ShiftsService);
let SurgeriesService = class SurgeriesService {
    constructor(surgeryModel) {
        this.surgeryModel = surgeryModel;
    }
    async bookSurgery(facilityId, body) {
        const start = new Date(body.scheduled_at);
        const end = new Date(start.getTime() + body.duration_mins * 60 * 1000);
        const conflicting = await this.surgeryModel.findOne({
            facility_id: facilityId,
            ot_room_number: body.ot_room_number,
            status: { $ne: 'cancelled' },
            scheduled_at: { $lt: end },
        });
        if (conflicting) {
            const conflictEnd = new Date(conflicting.scheduled_at.getTime() + conflicting.duration_mins * 60 * 1000);
            if (conflictEnd > start) {
                throw new common_1.BadRequestException('ot_room_already_booked_at_this_time');
            }
        }
        return this.surgeryModel.create({
            id: (0, uuid_1.v4)(),
            facility_id: facilityId,
            patient_id: body.patient_id,
            primary_surgeon_id: body.primary_surgeon_id,
            assistants: body.assistants || [],
            ot_room_number: body.ot_room_number,
            scheduled_at: body.scheduled_at,
            duration_mins: body.duration_mins,
            status: 'confirmed',
        });
    }
    async listSurgeries(facilityId) {
        return this.surgeryModel.find({ facility_id: facilityId }).sort({ scheduled_at: 1 }).lean();
    }
};
exports.SurgeriesService = SurgeriesService;
exports.SurgeriesService = SurgeriesService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(hospital_operations_schema_1.SurgeryBooking.name)),
    __metadata("design:paramtypes", [mongoose_2.Model])
], SurgeriesService);
let FacilityBedsController = class FacilityBedsController {
    constructor(svc) {
        this.svc = svc;
    }
    listWards(u) {
        return this.svc.listWards(u.parent_provider_account_id || u.id);
    }
    getWardBeds(wardId) {
        return this.svc.getWardBeds(wardId);
    }
    createWard(u, b) {
        return this.svc.createWard(u.parent_provider_account_id || u.id, b.name, b.total_beds);
    }
    admit(u, b) {
        return this.svc.admitPatient(u.parent_provider_account_id || u.id, b.patient_id, b.bed_id);
    }
    admissions(u) {
        return this.svc.listAdmissions(u.parent_provider_account_id || u.id);
    }
    discharge(u, id, b) {
        return this.svc.dischargePatient(u.parent_provider_account_id || u.id, id, b);
    }
};
exports.FacilityBedsController = FacilityBedsController;
__decorate([
    (0, common_1.Get)('wards'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], FacilityBedsController.prototype, "listWards", null);
__decorate([
    (0, common_1.Get)('wards/:wardId/beds'),
    __param(0, (0, common_1.Param)('wardId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], FacilityBedsController.prototype, "getWardBeds", null);
__decorate([
    (0, common_1.Post)('wards'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], FacilityBedsController.prototype, "createWard", null);
__decorate([
    (0, common_1.Post)('admission'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], FacilityBedsController.prototype, "admit", null);
__decorate([
    (0, common_1.Get)('admissions'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], FacilityBedsController.prototype, "admissions", null);
__decorate([
    (0, common_1.Put)('discharge/:admissionId'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('admissionId')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", void 0)
], FacilityBedsController.prototype, "discharge", null);
exports.FacilityBedsController = FacilityBedsController = __decorate([
    (0, common_1.Controller)('facility/beds'),
    (0, common_1.UseGuards)(auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [BedsService])
], FacilityBedsController);
let FacilityShiftsController = class FacilityShiftsController {
    constructor(svc) {
        this.svc = svc;
    }
    listShifts(u) {
        return this.svc.listShifts(u.parent_provider_account_id || u.id);
    }
    createShift(u, b) {
        return this.svc.createShift(u.parent_provider_account_id || u.id, b);
    }
    substitute(u, id) {
        return this.svc.requestSubstitute(u.parent_provider_account_id || u.id, id);
    }
    updateShift(u, id, b) {
        return this.svc.updateShift(u.parent_provider_account_id || u.id, id, b);
    }
    deleteShift(u, id) {
        return this.svc.deleteShift(u.parent_provider_account_id || u.id, id);
    }
    checkIn(u, b) {
        return this.svc.checkIn(u.parent_provider_account_id || u.id, u.id, b?.lat, b?.lng);
    }
    checkOut(u, id) {
        return this.svc.checkOut(u.parent_provider_account_id || u.id, id);
    }
    getAttendance(u) {
        return this.svc.getAttendance(u.parent_provider_account_id || u.id);
    }
};
exports.FacilityShiftsController = FacilityShiftsController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], FacilityShiftsController.prototype, "listShifts", null);
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], FacilityShiftsController.prototype, "createShift", null);
__decorate([
    (0, common_1.Post)(':id/substitute'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], FacilityShiftsController.prototype, "substitute", null);
__decorate([
    (0, common_1.Patch)(':id'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", void 0)
], FacilityShiftsController.prototype, "updateShift", null);
__decorate([
    (0, common_1.Delete)(':id'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], FacilityShiftsController.prototype, "deleteShift", null);
__decorate([
    (0, common_1.Post)('attendance/check-in'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], FacilityShiftsController.prototype, "checkIn", null);
__decorate([
    (0, common_1.Post)('attendance/check-out/:attendanceId'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('attendanceId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], FacilityShiftsController.prototype, "checkOut", null);
__decorate([
    (0, common_1.Get)('attendance'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], FacilityShiftsController.prototype, "getAttendance", null);
exports.FacilityShiftsController = FacilityShiftsController = __decorate([
    (0, common_1.Controller)('facility/shifts'),
    (0, common_1.UseGuards)(auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [ShiftsService])
], FacilityShiftsController);
let FacilitySurgeriesController = class FacilitySurgeriesController {
    constructor(svc) {
        this.svc = svc;
    }
    book(u, b) {
        return this.svc.bookSurgery(u.parent_provider_account_id || u.id, b);
    }
    list(u) {
        return this.svc.listSurgeries(u.parent_provider_account_id || u.id);
    }
};
exports.FacilitySurgeriesController = FacilitySurgeriesController;
__decorate([
    (0, common_1.Post)('book'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], FacilitySurgeriesController.prototype, "book", null);
__decorate([
    (0, common_1.Get)('schedule'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], FacilitySurgeriesController.prototype, "list", null);
exports.FacilitySurgeriesController = FacilitySurgeriesController = __decorate([
    (0, common_1.Controller)('facility/surgeries'),
    (0, common_1.UseGuards)(auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [SurgeriesService])
], FacilitySurgeriesController);
let FacilityCommsController = class FacilityCommsController {
    constructor(conn) {
        this.conn = conn;
    }
    fid(u) { return u.parent_provider_account_id || u.id; }
    listAnnouncements(u) {
        return this.conn.db.collection('facility_announcements')
            .find({ facility_id: this.fid(u) }, { projection: { _id: 0 } })
            .sort({ createdAt: -1 }).limit(100).toArray();
    }
    async createAnnouncement(u, b) {
        const text = String(b?.text || '').trim().slice(0, 2000);
        if (!text)
            throw new common_1.BadRequestException('text is required');
        const doc = {
            id: (0, uuid_1.v4)(),
            facility_id: this.fid(u),
            text,
            sender: u.full_name || u.name || '',
            sender_id: u.id,
            createdAt: new Date(),
        };
        await this.conn.db.collection('facility_announcements').insertOne(doc);
        const { _id, ...rest } = doc;
        return rest;
    }
    listResources(u) {
        return this.conn.db.collection('facility_resources')
            .find({ facility_id: this.fid(u) }, { projection: { _id: 0 } })
            .sort({ createdAt: -1 }).limit(200).toArray();
    }
    async createResource(u, b) {
        const nameAr = String(b?.name_ar || '').trim().slice(0, 200);
        const nameEn = String(b?.name_en || '').trim().slice(0, 200);
        if (!nameAr && !nameEn)
            throw new common_1.BadRequestException('name is required');
        const type = String(b?.type || 'consultation').slice(0, 40);
        const doc = {
            id: (0, uuid_1.v4)(),
            facility_id: this.fid(u),
            branch_id: b?.branch_id ? String(b.branch_id).slice(0, 80) : null,
            name_ar: nameAr || nameEn,
            name_en: nameEn || nameAr,
            type,
            status: 'active',
            capacity: Math.max(1, Number(b?.capacity) || 1),
            createdAt: new Date(),
        };
        await this.conn.db.collection('facility_resources').insertOne(doc);
        const { _id, ...rest } = doc;
        return rest;
    }
    async updateResource(u, id, b) {
        const set = {};
        if (b?.name_ar !== undefined)
            set.name_ar = String(b.name_ar).slice(0, 200);
        if (b?.name_en !== undefined)
            set.name_en = String(b.name_en).slice(0, 200);
        if (b?.status !== undefined && ['active', 'maintenance', 'inactive'].includes(b.status))
            set.status = b.status;
        if (b?.capacity !== undefined)
            set.capacity = Math.max(1, Number(b.capacity) || 1);
        if (!Object.keys(set).length)
            throw new common_1.BadRequestException('nothing to update');
        const r = await this.conn.db.collection('facility_resources')
            .findOneAndUpdate({ id, facility_id: this.fid(u) }, { $set: set }, { returnDocument: 'after' });
        if (!r)
            throw new common_1.NotFoundException('resource not found');
        const { _id, ...rest } = r;
        return rest;
    }
};
exports.FacilityCommsController = FacilityCommsController;
__decorate([
    (0, common_1.Get)('announcements'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], FacilityCommsController.prototype, "listAnnouncements", null);
__decorate([
    (0, common_1.Post)('announcements'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], FacilityCommsController.prototype, "createAnnouncement", null);
__decorate([
    (0, common_1.Get)('resources'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], FacilityCommsController.prototype, "listResources", null);
__decorate([
    (0, common_1.Post)('resources'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], FacilityCommsController.prototype, "createResource", null);
__decorate([
    (0, common_1.Put)('resources/:id'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", Promise)
], FacilityCommsController.prototype, "updateResource", null);
exports.FacilityCommsController = FacilityCommsController = __decorate([
    (0, common_1.Controller)('facility'),
    (0, common_1.UseGuards)(auth_guard_1.JwtAuthGuard),
    __param(0, (0, mongoose_1.InjectConnection)()),
    __metadata("design:paramtypes", [mongoose_2.Connection])
], FacilityCommsController);
let FacilityOpsModule = class FacilityOpsModule {
};
exports.FacilityOpsModule = FacilityOpsModule;
exports.FacilityOpsModule = FacilityOpsModule = __decorate([
    (0, common_1.Module)({
        imports: [
            mongoose_1.MongooseModule.forFeature([
                { name: hospital_operations_schema_1.Ward.name, schema: hospital_operations_schema_1.WardSchema },
                { name: hospital_operations_schema_1.Bed.name, schema: hospital_operations_schema_1.BedSchema },
                { name: hospital_operations_schema_1.Admission.name, schema: hospital_operations_schema_1.AdmissionSchema },
                { name: hospital_operations_schema_1.Shift.name, schema: hospital_operations_schema_1.ShiftSchema },
                { name: hospital_operations_schema_1.Attendance.name, schema: hospital_operations_schema_1.AttendanceSchema },
                { name: hospital_operations_schema_1.SurgeryBooking.name, schema: hospital_operations_schema_1.SurgeryBookingSchema },
            ]),
        ],
        controllers: [FacilityBedsController, FacilityShiftsController, FacilitySurgeriesController, FacilityCommsController],
        providers: [BedsService, ShiftsService, SurgeriesService],
        exports: [BedsService, ShiftsService, SurgeriesService],
    })
], FacilityOpsModule);
//# sourceMappingURL=facility-ops.module.js.map